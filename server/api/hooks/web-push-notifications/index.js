/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const POLL_INTERVAL_MILLISECONDS = 5000;
const webpush = require('web-push');

const webPushConfigError = () => {
  const error = new Error('Web Push is enabled but VAPID configuration is invalid');
  error.code = 'WEB_PUSH_CONFIG';
  return error;
};

module.exports = function defineWebPushNotificationsHook(sails) {
  let interval;
  let startupTimeout;
  let isProcessing = false;

  const processDueNotifications = async () => {
    if (isProcessing) {
      return;
    }
    if (!ChatConversation.qm || !User.qm) {
      sails.log.warn('[WEB_PUSH_NOTIFICATION] Query methods are not ready');
      return;
    }

    isProcessing = true;
    try {
      const result = await sails.helpers.webPushNotifications.processDue();
      if (result.claimed > 0) {
        sails.log.info('[WEB_PUSH_NOTIFICATION][POLL]', result);
      }
    } catch (error) {
      sails.log.error('[WEB_PUSH_NOTIFICATION][POLL_ERROR]', {
        code: error.code || error.name || 'WEB_PUSH_POLL_ERROR',
      });
    } finally {
      isProcessing = false;
    }
  };

  return {
    initialize() {
      if (!sails.config.custom.webPush || !sails.config.custom.webPush.enabled) {
        return;
      }

      const { subject, publicKey, privateKey } = sails.config.custom.webPush;
      if (!subject || !publicKey || !privateKey) {
        throw webPushConfigError();
      }
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
      } catch (_error) {
        throw webPushConfigError();
      }
      sails.log.info('Initializing custom hook (`web-push-notifications`)');
      sails.after('hook:orm:loaded', () => {
        startupTimeout = setTimeout(processDueNotifications, POLL_INTERVAL_MILLISECONDS);
        interval = setInterval(processDueNotifications, POLL_INTERVAL_MILLISECONDS);
      });
    },

    teardown(done) {
      clearTimeout(startupTimeout);
      clearInterval(interval);
      done();
    },
  };
};
