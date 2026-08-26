/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('project_presentation_preview_job', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('presentation_id').notNullable().unique();
    table.text('source_filename').notNullable();
    table.text('status').notNullable().defaultTo('pending');
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('scheduled_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text('last_error');
    table.jsonb('result');
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table
      .foreign('presentation_id')
      .references('id')
      .inTable('project_presentation')
      .onDelete('CASCADE');
    table.index(
      ['status', 'scheduled_at'],
      'project_presentation_preview_job_status_scheduled_at_idx',
    );
  });

  await knex.raw(`
    ALTER TABLE project_presentation_preview_job
    ADD CONSTRAINT project_presentation_preview_job_status_check
    CHECK (status IN ('pending', 'processing', 'ready', 'failed'))
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('project_presentation_preview_job');
};
