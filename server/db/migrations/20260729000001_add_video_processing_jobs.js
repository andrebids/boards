/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('video_processing_job', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('file_reference_id').notNullable().unique();
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
      .foreign('file_reference_id')
      .references('id')
      .inTable('file_reference')
      .onDelete('CASCADE');
    table.index(['status', 'scheduled_at'], 'video_processing_job_status_scheduled_at_idx');
  });

  await knex.raw(`
    ALTER TABLE video_processing_job
    ADD CONSTRAINT video_processing_job_status_check
    CHECK (status IN ('pending', 'processing', 'ready', 'failed'))
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('video_processing_job');
};
