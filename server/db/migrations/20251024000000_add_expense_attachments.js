/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('expense_attachment', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('expense_id').notNullable();
    table.bigInteger('creator_user_id').nullable();
    table.text('type').notNullable();
    table.jsonb('data').notNullable();
    table.text('name').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.foreign('expense_id').references('id').inTable('expense').onDelete('CASCADE');
    table.foreign('creator_user_id').references('id').inTable('user_account').onDelete('SET NULL');
    table.index(['expense_id'], 'idx_expense_attachment_expense_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('expense_attachment');
};
