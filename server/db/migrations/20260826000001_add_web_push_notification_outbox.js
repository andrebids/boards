/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('web_push_notification', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('message_id').notNullable();
    table.bigInteger('conversation_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.text('kind').notNullable();
    table.text('status').notNullable().defaultTo('pending');
    table.timestamp('scheduled_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.integer('attempts').notNullable().defaultTo(0);
    table.text('last_error');
    table.timestamp('sent_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('message_id').references('id').inTable('chat_message').onDelete('CASCADE');
    table
      .foreign('conversation_id')
      .references('id')
      .inTable('chat_conversation')
      .onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['message_id', 'user_id'], {
      indexName: 'web_push_notification_message_user_unique',
    });
    table.index(['status', 'scheduled_at'], 'web_push_notification_status_scheduled_at_idx');
  });

  await knex.raw(`
    ALTER TABLE web_push_notification
    ADD CONSTRAINT web_push_notification_kind_check
    CHECK (kind IN ('mention', 'direct', 'general')),
    ADD CONSTRAINT web_push_notification_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'skipped', 'failed'))
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('web_push_notification');
};
