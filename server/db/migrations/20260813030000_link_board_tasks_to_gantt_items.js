/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('gantt_item', (table) => {
    table.bigInteger('source_task_id').unique();
    table.foreign('source_task_id').references('id').inTable('task').onDelete('SET NULL');
    table.index(['source_task_id'], 'gantt_item_source_task_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('gantt_item', (table) => {
    table.dropIndex(['source_task_id'], 'gantt_item_source_task_idx');
    table.dropColumn('source_task_id');
  });
};
