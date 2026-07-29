/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function defineVideoProcessingHook(sails) {
  let interval;
  let startupTimeout;
  let isProcessing = false;

  const processDueJobs = async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      const result = await sails.helpers.videoProcessing.processDue.with({
        maxJobs: sails.config.custom.videoProcessingMaxJobsPerRun,
      });
      if (result.processed || result.retried || result.failed) {
        sails.log.info('[VIDEO_PROCESSING][POLL]', result);
      }
    } catch (error) {
      sails.log.error('[VIDEO_PROCESSING][POLL_ERROR]', error);
    } finally {
      isProcessing = false;
    }
  };

  return {
    initialize() {
      if (!sails.config.custom.videoProcessingEnabled) {
        return;
      }

      sails.log.info('Initializing custom hook (`video-processing`)');
      sails.after('hook:orm:loaded', () => {
        startupTimeout = setTimeout(processDueJobs, 5000);
        interval = setInterval(
          processDueJobs,
          sails.config.custom.videoProcessingPollIntervalSeconds * 1000,
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
