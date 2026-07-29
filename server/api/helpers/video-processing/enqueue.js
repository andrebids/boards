/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    fileReferenceId: {
      type: 'string',
      required: true,
    },
    sourceFilename: {
      type: 'string',
      required: true,
    },
    connection: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let query = sails.sendNativeQuery(
      `INSERT INTO video_processing_job (
         file_reference_id,
         source_filename,
         status,
         scheduled_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, 'pending', NOW(), NOW(), NOW())
       ON CONFLICT (file_reference_id) DO UPDATE
       SET source_filename = EXCLUDED.source_filename,
           status = CASE
             WHEN video_processing_job.status = 'ready' THEN video_processing_job.status
             ELSE 'pending'
           END,
           scheduled_at = CASE
             WHEN video_processing_job.status = 'ready'
               THEN video_processing_job.scheduled_at
             ELSE NOW()
           END,
           last_error = CASE
             WHEN video_processing_job.status = 'ready' THEN video_processing_job.last_error
             ELSE NULL
           END,
           updated_at = NOW()
       RETURNING id`,
      [inputs.fileReferenceId, inputs.sourceFilename],
    );

    if (inputs.connection) {
      query = query.usingConnection(inputs.connection);
    }

    const result = await query;
    return result.rows[0];
  },
};
