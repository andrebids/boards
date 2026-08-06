/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const bcrypt = require('bcrypt');

const { isPassword } = require('../../../utils/validators');
const { getRemoteAddress } = require('../../../utils/remote-address');
const { hashPrivateValue, hashToken } = require('../../../utils/password-reset');

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MINUTES = 15;

const Errors = {
  INVALID_OR_EXPIRED_TOKEN: {
    invalidOrExpiredToken: 'Invalid or expired password reset token',
  },
  TOO_MANY_ATTEMPTS: {
    tooManyAttempts: 'Too many password reset attempts',
  },
};

module.exports = {
  inputs: {
    token: {
      type: 'string',
      minLength: 40,
      maxLength: 128,
      required: true,
    },
    password: {
      type: 'string',
      maxLength: 256,
      custom: isPassword,
      required: true,
    },
  },

  exits: {
    invalidOrExpiredToken: {
      responseType: 'unprocessableEntity',
    },
    tooManyAttempts: {
      statusCode: 429,
    },
  },

  async fn(inputs) {
    if (!sails.config.custom.passwordResetEnabled || sails.config.custom.oidcEnforced) {
      throw Errors.INVALID_OR_EXPIRED_TOKEN;
    }

    const { secret } = sails.config.session;
    const remoteAddressHash = hashPrivateValue(getRemoteAddress(this.req) || 'unknown', secret);
    const recentAttempts = await sails.sendNativeQuery(
      `SELECT COUNT(*)::int AS count
       FROM password_reset_attempt
       WHERE remote_address_hash = $1
         AND created_at >= NOW() - ($2 * INTERVAL '1 minute')`,
      [remoteAddressHash, ATTEMPT_WINDOW_MINUTES],
    );

    if (recentAttempts.rows[0].count >= ATTEMPT_LIMIT) {
      throw Errors.TOO_MANY_ATTEMPTS;
    }

    const tokenHash = hashToken(inputs.token);
    const initialResult = await sails.sendNativeQuery(
      `SELECT id
       FROM password_reset_request
       WHERE token_hash = $1
         AND status = 'sent'
         AND consumed_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash],
    );

    if (initialResult.rowCount === 0) {
      await sails.sendNativeQuery(
        `INSERT INTO password_reset_attempt (remote_address_hash, succeeded, created_at)
         VALUES ($1, false, NOW())`,
        [remoteAddressHash],
      );
      throw Errors.INVALID_OR_EXPIRED_TOKEN;
    }

    const passwordHash = await bcrypt.hash(inputs.password, 10);
    let resetUserId;

    try {
      await sails.getDatastore().transaction(async (db) => {
        const requestResult = await sails
          .sendNativeQuery(
            `SELECT pr.id, pr.user_id AS "userId", u.email, u.is_deactivated AS "isDeactivated",
                    u.is_sso_user AS "isSsoUser"
             FROM password_reset_request pr
             JOIN user_account u ON u.id = pr.user_id
             WHERE pr.token_hash = $1
               AND pr.status = 'sent'
               AND pr.consumed_at IS NULL
               AND pr.expires_at > NOW()
             FOR UPDATE`,
            [tokenHash],
          )
          .usingConnection(db);

        if (requestResult.rowCount === 0) {
          throw new Error('INVALID_RESET_TOKEN');
        }

        const request = requestResult.rows[0];
        if (
          request.isDeactivated ||
          request.isSsoUser ||
          request.email === sails.config.custom.defaultAdminEmail
        ) {
          throw new Error('INVALID_RESET_TOKEN');
        }

        resetUserId = request.userId;
        await sails
          .sendNativeQuery(
            `UPDATE user_account
             SET password = $1,
                 password_changed_at = NOW(),
                 must_change_password = false,
                 updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, resetUserId],
          )
          .usingConnection(db);
        await sails
          .sendNativeQuery(
            `UPDATE password_reset_request
             SET status = CASE WHEN id = $1 THEN 'consumed' ELSE 'superseded' END,
                 consumed_at = CASE WHEN id = $1 THEN NOW() ELSE consumed_at END,
                 encrypted_token = NULL,
                 updated_at = NOW()
             WHERE user_id = $2 AND status IN ('pending', 'processing', 'sent')`,
            [request.id, resetUserId],
          )
          .usingConnection(db);
        await sails
          .sendNativeQuery('DELETE FROM session WHERE user_id = $1', [resetUserId])
          .usingConnection(db);
        await sails
          .sendNativeQuery(
            `INSERT INTO password_reset_attempt (remote_address_hash, succeeded, created_at)
             VALUES ($1, true, NOW())`,
            [remoteAddressHash],
          )
          .usingConnection(db);
      });
    } catch (error) {
      if (error.message === 'INVALID_RESET_TOKEN') {
        await sails.sendNativeQuery(
          `INSERT INTO password_reset_attempt (remote_address_hash, succeeded, created_at)
           VALUES ($1, false, NOW())`,
          [remoteAddressHash],
        );
        throw Errors.INVALID_OR_EXPIRED_TOKEN;
      }
      throw error;
    }

    sails.sockets.leaveAll(`@user:${resetUserId}`);
    return { success: true };
  },
};
