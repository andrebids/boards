/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const knex = require('knex');

const knexConfig = require('../db/knexfile');

const run = async () => {
  const db = knex(knexConfig);

  try {
    const result = await db.transaction(async (transaction) => {
      const insertResult = await transaction.raw(
        `WITH video_sources AS (
           SELECT DISTINCT
             (data->>'fileReferenceId')::bigint AS file_reference_id,
             data->>'filename' AS source_filename
           FROM attachment
           WHERE type = 'file'
             AND jsonb_typeof(data->'video') = 'object'
             AND data->'video'->'playback' IS NULL
             AND data->>'fileReferenceId' IS NOT NULL
             AND data->>'filename' IS NOT NULL

           UNION

           SELECT DISTINCT
             file_reference_id,
             data->>'filename' AS source_filename
           FROM chat_message_attachment
           WHERE jsonb_typeof(data->'video') = 'object'
             AND data->'video'->'playback' IS NULL
             AND data->>'filename' IS NOT NULL
         )
         INSERT INTO video_processing_job (
           file_reference_id,
           source_filename,
           status,
           scheduled_at,
           created_at,
           updated_at
         )
         SELECT
           file_reference_id,
           source_filename,
           'pending',
           NOW(),
           NOW(),
           NOW()
         FROM video_sources
         ON CONFLICT (file_reference_id) DO UPDATE
         SET source_filename = EXCLUDED.source_filename,
             status = 'pending',
             attempts = 0,
             scheduled_at = NOW(),
             last_error = NULL,
             result = NULL,
             completed_at = NULL,
             updated_at = NOW()
         RETURNING file_reference_id`,
      );

      const updateCardResult = await transaction.raw(
        `UPDATE attachment AS attachment_record
         SET data = jsonb_set(attachment_record.data, '{video,status}', '"pending"', true),
             updated_at = NOW()
         FROM video_processing_job AS job
         WHERE attachment_record.data->>'fileReferenceId' = job.file_reference_id::text
           AND job.status = 'pending'
           AND jsonb_typeof(attachment_record.data->'video') = 'object'
           AND attachment_record.data->'video'->'playback' IS NULL`,
      );

      const updateChatResult = await transaction.raw(
        `UPDATE chat_message_attachment AS attachment_record
         SET data = jsonb_set(attachment_record.data, '{video,status}', '"pending"', true),
             updated_at = NOW()
         FROM video_processing_job AS job
         WHERE attachment_record.file_reference_id = job.file_reference_id
           AND job.status = 'pending'
           AND jsonb_typeof(attachment_record.data->'video') = 'object'
           AND attachment_record.data->'video'->'playback' IS NULL`,
      );

      return {
        cardAttachmentsUpdated: updateCardResult.rowCount,
        chatAttachmentsUpdated: updateChatResult.rowCount,
        jobsQueued: insertResult.rowCount,
      };
    });

    console.log(JSON.stringify(result, null, 2)); // eslint-disable-line no-console
  } finally {
    await db.destroy();
  }
};

run().catch((error) => {
  console.error(error); // eslint-disable-line no-console
  process.exitCode = 1;
});
