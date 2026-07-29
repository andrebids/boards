/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function defineChatEmailNotificationsHook(sails) {
  let interval;
  let startupTimeout;
  let isProcessing = false;

  const processDueNotifications = async () => {
    if (isProcessing) {
      return;
    }
    if (!ChatConversation.qm || !User.qm) {
      sails.log.warn(
        '[CHAT_EMAIL_NOTIFICATION] Query methods are not ready; retrying on the next poll',
      );
      return;
    }

    isProcessing = true;
    try {
      const result = await sails.helpers.chatEmailNotifications.processDue.with({
        maxBatches: sails.config.custom.chatEmailNotificationMaxBatchesPerRun,
      });
      if (result.batches > 0) {
        sails.log.info('[CHAT_EMAIL_NOTIFICATION][POLL]', result);
      }
    } catch (error) {
      sails.log.error('[CHAT_EMAIL_NOTIFICATION][POLL_ERROR]', error);
    } finally {
      isProcessing = false;
    }
  };

  return {
    initialize() {
      if (!sails.config.custom.chatEmailNotificationsEnabled) {
        return;
      }

      sails.log.info('Initializing custom hook (`chat-email-notifications`)');
      const intervalMilliseconds =
        sails.config.custom.chatEmailNotificationPollIntervalSeconds * 1000;

      sails.after('hook:orm:loaded', () => {
        startupTimeout = setTimeout(processDueNotifications, 5000);
        interval = setInterval(processDueNotifications, intervalMilliseconds);
      });
    },

    teardown(done) {
      clearTimeout(startupTimeout);
      clearInterval(interval);
      done();
    },
  };
};
