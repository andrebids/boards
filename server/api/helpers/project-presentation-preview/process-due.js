/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const PROCESSING_STALE_AFTER_MINUTES = 30;
const MAX_ERROR_LENGTH = 2000;

const truncateError = (error) =>
  String(error && (error.stack || error.message || error)).slice(0, MAX_ERROR_LENGTH);

const recoverStaleJobs = () =>
  sails.sendNativeQuery(
    `UPDATE project_presentation_preview_job
     SET status = 'pending',
         scheduled_at = NOW(),
         last_error = COALESCE(last_error, 'Recovered after interrupted processing'),
         updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - ($1 * INTERVAL '1 minute')`,
    [PROCESSING_STALE_AFTER_MINUTES],
  );

const claimNextJob = () =>
  sails.getDatastore().transaction(async (db) => {
    const result = await sails
      .sendNativeQuery(
        `UPDATE project_presentation_preview_job
         SET status = 'processing',
             attempts = attempts + 1,
             updated_at = NOW()
         WHERE id = (
           SELECT id
           FROM project_presentation_preview_job
           WHERE status = 'pending'
             AND scheduled_at <= NOW()
           ORDER BY scheduled_at, id
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING id,
                   presentation_id AS "presentationId",
                   source_filename AS "sourceFilename",
                   attempts`,
      )
      .usingConnection(db);

    return result.rows[0] || null;
  });

const markReady = (job, preview) =>
  sails.sendNativeQuery(
    `UPDATE project_presentation_preview_job
     SET status = 'ready',
         result = $2::jsonb,
         last_error = NULL,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [job.id, JSON.stringify(preview)],
  );

const requeueOrFail = async (job, error, maxAttempts) => {
  const lastError = truncateError(error);
  if (job.attempts >= maxAttempts) {
    await sails.sendNativeQuery(
      `UPDATE project_presentation_preview_job
       SET status = 'failed',
           last_error = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [job.id, lastError],
    );
    await sails.helpers.projectPresentationPreview.applyPreview.with({
      presentationId: job.presentationId,
      sourceFilename: job.sourceFilename,
      preview: {
        status: 'failed',
        sourceFilename: job.sourceFilename,
      },
    });
    return 'failed';
  }

  const retryDelaySeconds = Math.min(60 * 30, 15 * 2 ** job.attempts);
  await sails.sendNativeQuery(
    `UPDATE project_presentation_preview_job
     SET status = 'pending',
         scheduled_at = NOW() + ($2 * INTERVAL '1 second'),
         last_error = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [job.id, retryDelaySeconds, lastError],
  );
  return 'retried';
};

module.exports = {
  inputs: {
    maxJobs: {
      type: 'number',
      required: true,
    },
  },

  async fn(inputs) {
    const result = { failed: 0, processed: 0, retried: 0 };
    await recoverStaleJobs();

    /* eslint-disable no-await-in-loop */
    for (let index = 0; index < inputs.maxJobs; index += 1) {
      const job = await claimNextJob();
      if (!job) {
        break;
      }

      try {
        const preview = await sails.helpers.projectPresentationPreview.processOne.with({
          job,
        });
        await sails.helpers.projectPresentationPreview.applyPreview.with({
          presentationId: job.presentationId,
          sourceFilename: job.sourceFilename,
          preview,
        });
        await markReady(job, preview);
        result.processed += 1;
      } catch (error) {
        const outcome = await requeueOrFail(
          job,
          error,
          sails.config.custom.projectPresentationPreviewMaxAttempts,
        );
        result[outcome] += 1;
        sails.log.error('[PROJECT_PRESENTATION_PREVIEW][ERROR]', {
          error: truncateError(error),
          jobId: job.id,
          outcome,
          presentationId: job.presentationId,
        });
      }
    }
    /* eslint-enable no-await-in-loop */

    return result;
  },
};
