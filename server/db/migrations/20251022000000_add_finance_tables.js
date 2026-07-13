/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  console.log('🔵 [MIGRATION] Iniciando criação das tabelas do Finance Panel...');

  await knex.schema.createTable('project_finance', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable().unique();
    table.decimal('budget', 12, 2).notNullable().defaultTo(0.0);
    table.text('currency').notNullable().defaultTo('EUR');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.index(['project_id'], 'idx_project_finance_project_id');
  });

  await knex.schema.createTable('finance_member', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['project_id', 'user_id'], 'uq_finance_member_project_user');
    table.index(['project_id', 'user_id'], 'idx_finance_member_project_user');
  });

  await knex.schema.createTable('expense', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.text('category').notNullable();
    table.text('description').notNullable();
    table.decimal('value', 12, 2).notNullable();
    table.date('date').notNullable();
    table.text('status').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.index(['project_id'], 'idx_expense_project_id');
    table.index(['date'], 'idx_expense_date');
    table.index(['status'], 'idx_expense_status');
  });

  await knex.raw(`
    ALTER TABLE expense
    ADD CONSTRAINT chk_expense_status
    CHECK (status IN ('paid', 'pending'))
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('expense');
  await knex.schema.dropTableIfExists('finance_member');
  await knex.schema.dropTableIfExists('project_finance');
};
