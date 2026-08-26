/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    presentationId: {
      type: 'string',
      required: true,
    },
    sourceFilename: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const result = await sails.sendNativeQuery(
      `INSERT INTO project_presentation_preview_job (
         presentation_id,
         source_filename,
         status,
         scheduled_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, 'pending', NOW(), NOW(), NOW())
       ON CONFLICT (presentation_id) DO UPDATE
       SET source_filename = EXCLUDED.source_filename,
           status = 'pending',
           attempts = 0,
           scheduled_at = NOW(),
           last_error = NULL,
           completed_at = NULL,
           updated_at = NOW()
       RETURNING id`,
      [inputs.presentationId, inputs.sourceFilename],
    );

    return result.rows[0];
  },
};
