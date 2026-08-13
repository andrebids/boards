/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('gantt_plan', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable().unique();
    table.boolean('is_enabled').notNullable().defaultTo(true);
    table.text('default_zoom_level').notNullable().defaultTo('week');
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

  await knex.raw(`
    ALTER TABLE gantt_plan
    ADD CONSTRAINT gantt_plan_default_zoom_level_check
    CHECK (default_zoom_level IN ('day', 'week', 'month'))
  `);

  await knex.schema.createTable('gantt_item', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('gantt_plan_id').notNullable();
    table.text('task').notNullable();
    table.text('project');
    table.text('status');
    table.date('start_date');
    table.date('end_date');
    table.integer('expected_duration_days').notNullable().defaultTo(1);
    table.text('color');
    table.double('position').notNullable();
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('gantt_plan_id').references('id').inTable('gantt_plan').onDelete('CASCADE');
    table.index(['gantt_plan_id', 'position'], 'gantt_item_plan_position_idx');
    table.index(['gantt_plan_id', 'start_date', 'end_date'], 'gantt_item_plan_dates_idx');
  });

  await knex.raw(`
    ALTER TABLE gantt_item
    ADD CONSTRAINT gantt_item_duration_check CHECK (expected_duration_days >= 1),
    ADD CONSTRAINT gantt_item_dates_presence_check CHECK (
      (start_date IS NULL AND end_date IS NULL) OR
      (start_date IS NOT NULL AND end_date IS NOT NULL)
    ),
    ADD CONSTRAINT gantt_item_dates_order_check CHECK (
      start_date IS NULL OR start_date <= end_date
    ),
    ADD CONSTRAINT gantt_item_dates_duration_check CHECK (
      start_date IS NULL OR (end_date - start_date + 1) = expected_duration_days
    )
  `);

  await knex.schema.createTable('gantt_item_assignee', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('gantt_item_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('gantt_item_id').references('id').inTable('gantt_item').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['gantt_item_id', 'user_id'], {
      indexName: 'gantt_item_assignee_item_user_unique',
    });
    table.index(['user_id'], 'gantt_item_assignee_user_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('gantt_item_assignee');
  await knex.schema.dropTableIfExists('gantt_item');
  await knex.schema.dropTableIfExists('gantt_plan');
};
