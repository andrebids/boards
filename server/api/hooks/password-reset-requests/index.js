/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function definePasswordResetRequestsHook(sails) {
  let interval;
  let startupTimeout;
  let isProcessing = false;

  const processDue = async () => {
    if (isProcessing || !User.qm) {
      return;
    }
    isProcessing = true;
    try {
      await sails.helpers.passwordResetRequests.processDue.with({
        maxRequests: 20,
      });
    } catch (error) {
      sails.log.error('[PASSWORD_RESET][POLL_ERROR]', error);
    } finally {
      isProcessing = false;
    }
  };

  return {
    initialize() {
      if (!sails.config.custom.passwordResetEnabled) {
        return;
      }
      sails.after('hook:orm:loaded', () => {
        startupTimeout = setTimeout(processDue, 5000);
        interval = setInterval(
          processDue,
          sails.config.custom.passwordResetPollIntervalSeconds * 1000,
        );
      });
    },

    teardown(done) {
      clearTimeout(startupTimeout);
      clearInterval(interval);
      done();
    },
  };
};
