/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('project_presentation', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable().unique();
    table.boolean('is_enabled').notNullable().defaultTo(false);
    table.text('title').notNullable().defaultTo('Apresentação');
    table.bigInteger('created_by_user_id');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table
      .foreign('created_by_user_id')
      .references('id')
      .inTable('user_account')
      .onDelete('SET NULL');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('project_presentation');
};
