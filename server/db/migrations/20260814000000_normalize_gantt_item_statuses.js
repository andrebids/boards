/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.raw(`
    UPDATE gantt_item
    SET status = CASE
      WHEN LOWER(TRIM(status)) IN ('notstarted', 'not started', 'planned', 'planeado', 'por iniciar')
        THEN 'notStarted'
      WHEN LOWER(TRIM(status)) IN ('inprogress', 'in progress', 'em curso')
        THEN 'inProgress'
      WHEN LOWER(TRIM(status)) IN ('completed', 'concluido', 'concluído')
        THEN 'completed'
      ELSE status
    END
    WHERE status IS NOT NULL
  `);

exports.down = (knex) =>
  knex.raw(`
    UPDATE gantt_item
    SET status = CASE status
      WHEN 'notStarted' THEN 'Not started'
      WHEN 'inProgress' THEN 'In progress'
      WHEN 'completed' THEN 'Completed'
      ELSE status
    END
    WHERE status IN ('notStarted', 'inProgress', 'completed')
  `);
