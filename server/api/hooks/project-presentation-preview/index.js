/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function defineProjectPresentationPreviewHook(sails) {
  let interval;
  let startupTimeout;
  let isProcessing = false;

  const processDueJobs = async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      const result = await sails.helpers.projectPresentationPreview.processDue.with({
        maxJobs: sails.config.custom.projectPresentationPreviewMaxJobsPerRun,
      });
      if (result.processed || result.retried || result.failed) {
        sails.log.info('[PROJECT_PRESENTATION_PREVIEW][POLL]', result);
      }
    } catch (error) {
      sails.log.error('[PROJECT_PRESENTATION_PREVIEW][POLL_ERROR]', error);
    } finally {
      isProcessing = false;
    }
  };

  return {
    initialize() {
      if (!sails.config.custom.projectPresentationPreviewEnabled) {
        return;
      }

      sails.log.info('Initializing custom hook (`project-presentation-preview`)');
      sails.after('hook:orm:loaded', () => {
        startupTimeout = setTimeout(processDueJobs, 5000);
        interval = setInterval(
          processDueJobs,
          sails.config.custom.projectPresentationPreviewPollIntervalSeconds * 1000,
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
