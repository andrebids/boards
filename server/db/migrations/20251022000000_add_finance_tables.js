/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  console.log('🔵 [MIGRATION] Iniciando criação das tabelas do Finance Panel...');
  
  // 1. Criar tabela project_finance
  await knex.schema.createTable('project_finance', (table) => {
    /* Columns */
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable().unique();
    table.decimal('budget', 12, 2).notNullable().defaultTo(0.00);
    table.text('currency').notNullable().defaultTo('EUR');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    /* Foreign Keys */
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');

    /* Indexes */
    table.index(['project_id'], 'idx_project_finance_project_id');
  });

  console.log('✅ [MIGRATION] Tabela project_finance criada.');

  // 2. Criar tabela finance_member
  await knex.schema.createTable('finance_member', (table) => {
    /* Columns */
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    /* Foreign Keys */
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');

    /* Constraints */
    table.unique(['project_id', 'user_id'], 'uq_finance_member_project_user');

    /* Indexes */
    table.index(['project_id', 'user_id'], 'idx_finance_member_project_user');
  });

  console.log('✅ [MIGRATION] Tabela finance_member criada.');

  // 3. Criar tabela expense
  await knex.schema.createTable('expense', (table) => {
    /* Columns */
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

    /* Foreign Keys */
    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');

    /* Indexes */
    table.index(['project_id'], 'idx_expense_project_id');
    table.index(['date'], 'idx_expense_date');
    table.index(['status'], 'idx_expense_status');
  });

  // Adicionar check constraint para status
  await knex.raw(`
    ALTER TABLE expense 
    ADD CONSTRAINT chk_expense_status 
    CHECK (status IN ('paid', 'pending'))
  `);

  console.log('✅ [MIGRATION] Tabela expense criada.');
  console.log('✅ [MIGRATION] Migration do Finance Panel completa!');
};

exports.down = async (knex) => {
  console.log('🔴 [MIGRATION] Revertendo: removendo tabelas do Finance Panel...');
  
  await knex.schema.dropTableIfExists('expense');
  console.log('✅ [MIGRATION] Tabela expense removida.');
  
  await knex.schema.dropTableIfExists('finance_member');
  console.log('✅ [MIGRATION] Tabela finance_member removida.');
  
  await knex.schema.dropTableIfExists('project_finance');
  console.log('✅ [MIGRATION] Tabela project_finance removida.');
  
  console.log('✅ [MIGRATION] Rollback completo.');
};

