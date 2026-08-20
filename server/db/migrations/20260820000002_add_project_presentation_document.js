/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('project_presentation', (table) => {
    table.jsonb('document_data');
    table.text('cryptpad_edit_key');
    table.text('cryptpad_view_key');
    table.integer('cryptpad_key_version').notNullable().defaultTo(0);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('project_presentation', (table) => {
    table.dropColumns(
      'document_data',
      'cryptpad_edit_key',
      'cryptpad_view_key',
      'cryptpad_key_version',
    );
  });
};
