/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('chat_link_preview', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.text('normalized_url').notNullable();
    table.text('url').notNullable();
    table.text('hostname').notNullable();
    table.text('title');
    table.text('description');
    table.text('site_name');
    table.text('status').notNullable().defaultTo('pending');
    table.timestamp('fetched_at', { useTz: true });
    table.timestamp('expires_at', { useTz: true });
    table.text('failure_reason');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table.unique(['project_id', 'normalized_url'], {
      indexName: 'chat_link_preview_project_url_unique',
    });
    table.index(['project_id', 'expires_at'], 'chat_link_preview_project_expiry_idx');
  });

  await knex.raw(`
    ALTER TABLE chat_link_preview
    ADD CONSTRAINT chat_link_preview_status_check
    CHECK (status IN ('pending', 'ready', 'failed', 'blocked'))
  `);

  await knex.schema.createTable('chat_message_link_preview', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('message_id').notNullable();
    table.bigInteger('link_preview_id').notNullable();
    table.integer('position').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('message_id').references('id').inTable('chat_message').onDelete('CASCADE');
    table
      .foreign('link_preview_id')
      .references('id')
      .inTable('chat_link_preview')
      .onDelete('CASCADE');
    table.unique(['message_id', 'link_preview_id'], {
      indexName: 'chat_message_link_preview_unique',
    });
    table.index(['message_id', 'position'], 'chat_message_link_preview_message_position_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('chat_message_link_preview');
  await knex.schema.dropTableIfExists('chat_link_preview');
};
