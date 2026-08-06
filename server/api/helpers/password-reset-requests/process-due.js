/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { decryptToken } = require('../../../utils/password-reset');

const STALE_AFTER_MINUTES = 10;
const MAX_ERROR_LENGTH = 1000;

const truncateError = (error) =>
  String(error && (error.stack || error.message || error)).slice(0, MAX_ERROR_LENGTH);

const recoverStale = () =>
  sails.sendNativeQuery(
    `UPDATE password_reset_request
     SET status = 'pending', scheduled_at = NOW(), updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - ($1 * INTERVAL '1 minute')`,
    [STALE_AFTER_MINUTES],
  );

const claimOne = () =>
  sails.getDatastore().transaction(async (db) => {
    const result = await sails
      .sendNativeQuery(
        `UPDATE password_reset_request
         SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
         WHERE id = (
           SELECT id FROM password_reset_request
           WHERE status = 'pending' AND scheduled_at <= NOW()
           ORDER BY scheduled_at, id
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING id, user_id AS "userId", encrypted_token AS "encryptedToken",
                   expires_at AS "expiresAt", attempts`,
      )
      .usingConnection(db);
    return result.rows[0] || null;
  });

const updateRequest = (id, sql, values = []) =>
  sails.sendNativeQuery(
    `UPDATE password_reset_request
     SET ${sql}, updated_at = NOW()
     WHERE id = $1 AND status = 'processing'`,
    [id, ...values],
  );

module.exports = {
  inputs: {
    maxRequests: {
      type: 'number',
      required: true,
    },
  },

  async fn(inputs) {
    const result = { processed: 0, sent: 0, failed: 0, skipped: 0 };
    if (!sails.config.custom.passwordResetEnabled || !sails.hooks.smtp.isEnabled()) {
      return result;
    }

    await recoverStale();

    /* eslint-disable no-await-in-loop, no-continue */
    for (let index = 0; index < inputs.maxRequests; index += 1) {
      const request = await claimOne();
      if (!request) {
        break;
      }
      result.processed += 1;

      try {
        const user = await User.qm.getOneById(request.userId, {
          withDeactivated: true,
        });
        if (
          !user ||
          user.isDeactivated ||
          user.isSsoUser ||
          user.email === sails.config.custom.defaultAdminEmail ||
          new Date(request.expiresAt) <= new Date()
        ) {
          await updateRequest(
            request.id,
            `status = 'skipped', encrypted_token = NULL, last_error = $2`,
            ['Request is no longer eligible'],
          );
          result.skipped += 1;
          continue;
        }

        const token = decryptToken(request.encryptedToken, sails.config.session.secret);
        const messageId = `<boards-password-reset-${request.id}@boards.dsproject.pt>`;
        await sails.helpers.passwordResetRequests.sendEmail.with({
          user,
          token,
          messageId,
        });
        await updateRequest(
          request.id,
          `status = 'sent', sent_at = NOW(), encrypted_token = NULL, last_error = NULL`,
        );
        result.sent += 1;
      } catch (error) {
        const failure = truncateError(error);
        if (request.attempts >= sails.config.custom.passwordResetMaxAttempts) {
          await updateRequest(
            request.id,
            `status = 'failed', encrypted_token = NULL, last_error = $2`,
            [failure],
          );
        } else {
          const delaySeconds = Math.min(15 * 60, 30 * 2 ** request.attempts);
          await updateRequest(
            request.id,
            `status = 'pending', scheduled_at = NOW() + ($2 * INTERVAL '1 second'), last_error = $3`,
            [delaySeconds, failure],
          );
        }
        result.failed += 1;
        sails.log.error('[PASSWORD_RESET][EMAIL_ERROR]', {
          requestId: request.id,
          error: failure,
        });
      }
    }
    /* eslint-enable no-await-in-loop, no-continue */

    await sails.sendNativeQuery(
      `DELETE FROM password_reset_attempt WHERE created_at < NOW() - INTERVAL '1 day'`,
    );
    await sails.sendNativeQuery(
      `DELETE FROM password_reset_request WHERE created_at < NOW() - INTERVAL '7 days'`,
    );

    return result;
  },
};
