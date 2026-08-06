/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const validator = require('validator');

const { getRemoteAddress } = require('../../../utils/remote-address');
const {
  encryptToken,
  generateToken,
  hashPrivateValue,
  hashToken,
} = require('../../../utils/password-reset');

const ACCOUNT_LIMIT = 3;
const ACCOUNT_WINDOW_MINUTES = 60;
const IP_LIMIT = 10;
const IP_WINDOW_MINUTES = 15;
const MINIMUM_RESPONSE_MILLISECONDS = 300;

const waitForMinimumResponseTime = async (startedAt) => {
  const remaining = MINIMUM_RESPONSE_MILLISECONDS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remaining);
    });
  }
};

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      custom: validator.isEmail,
      required: true,
    },
  },

  async fn(inputs) {
    const startedAt = Date.now();
    const accepted = { accepted: true };

    if (
      !sails.config.custom.passwordResetEnabled ||
      !sails.hooks.smtp.isEnabled() ||
      sails.config.custom.oidcEnforced
    ) {
      await waitForMinimumResponseTime(startedAt);
      return accepted;
    }

    const email = inputs.email.trim().toLowerCase();
    const { secret } = sails.config.session;
    const identifierHash = hashPrivateValue(email, secret);
    const remoteAddressHash = hashPrivateValue(getRemoteAddress(this.req) || 'unknown', secret);

    const limitResult = await sails.sendNativeQuery(
      `SELECT
         COUNT(*) FILTER (
           WHERE identifier_hash = $1
             AND created_at >= NOW() - ($2 * INTERVAL '1 minute')
         )::int AS "accountRequests",
         COUNT(*) FILTER (
           WHERE remote_address_hash = $3
             AND created_at >= NOW() - ($4 * INTERVAL '1 minute')
         )::int AS "ipRequests"
       FROM password_reset_request
       WHERE (identifier_hash = $1 OR remote_address_hash = $3)
         AND created_at >= NOW() - (GREATEST($2, $4) * INTERVAL '1 minute')`,
      [identifierHash, ACCOUNT_WINDOW_MINUTES, remoteAddressHash, IP_WINDOW_MINUTES],
    );

    const { accountRequests, ipRequests } = limitResult.rows[0];
    if (accountRequests >= ACCOUNT_LIMIT || ipRequests >= IP_LIMIT) {
      await waitForMinimumResponseTime(startedAt);
      return accepted;
    }

    const user = await User.qm.getOneByEmail(email);
    const isEligible = Boolean(
      user &&
        !user.isDeactivated &&
        !user.isSsoUser &&
        user.email !== sails.config.custom.defaultAdminEmail,
    );

    let token = null;
    let tokenHash = null;
    let encryptedToken = null;
    if (isEligible) {
      token = generateToken();
      tokenHash = hashToken(token);
      encryptedToken = encryptToken(token, secret);
    }

    await sails.getDatastore().transaction(async (db) => {
      if (isEligible) {
        await sails
          .sendNativeQuery(
            `UPDATE password_reset_request
             SET status = 'superseded', encrypted_token = NULL, updated_at = NOW()
             WHERE user_id = $1 AND status IN ('pending', 'processing', 'sent')`,
            [user.id],
          )
          .usingConnection(db);
      }

      await sails
        .sendNativeQuery(
          `INSERT INTO password_reset_request (
             user_id, identifier_hash, remote_address_hash, token_hash, encrypted_token,
             status, scheduled_at, expires_at, created_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, NOW(),
             CASE WHEN $7::int IS NULL THEN NULL ELSE NOW() + ($7 * INTERVAL '1 minute') END,
             NOW()
           )`,
          [
            isEligible ? user.id : null,
            identifierHash,
            remoteAddressHash,
            tokenHash,
            encryptedToken,
            isEligible ? 'pending' : 'skipped',
            isEligible ? sails.config.custom.passwordResetTokenExpiresInMinutes : null,
          ],
        )
        .usingConnection(db);
    });

    await waitForMinimumResponseTime(startedAt);
    return accepted;
  },
};
