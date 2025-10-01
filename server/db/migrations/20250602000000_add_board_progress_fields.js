/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.table('board', (table) => {
    /* Columns */
    table.boolean('progress_bar_enabled').defaultTo(false);
    table.integer('progress_bar_percentage').defaultTo(0);
    
    /* Indexes - opcional, adicionar se houver queries frequentes */
    // table.index('progress_bar_enabled');
  });
  
  // Adicionar constraint de validação
  return knex.raw(`
    ALTER TABLE board
    ADD CONSTRAINT board_progress_percentage_check
    CHECK (progress_bar_percentage >= 0 AND progress_bar_percentage <= 100);
  `);
};

exports.down = async (knex) => {
  await knex.raw('ALTER TABLE board DROP CONSTRAINT IF EXISTS board_progress_percentage_check;');
  
  return knex.schema.table('board', (table) => {
    table.dropColumn('progress_bar_enabled');
    table.dropColumn('progress_bar_percentage');
  });
};

