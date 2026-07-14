/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.dropTableIfExists('chat_saved_message');
};

exports.down = async (knex) => {
  await knex.schema.createTable('chat_saved_message', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('user_id').notNullable();
    table.bigInteger('message_id').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.foreign('message_id').references('id').inTable('chat_message').onDelete('CASCADE');
    table.unique(['user_id', 'message_id'], {
      indexName: 'chat_saved_message_user_message_unique',
    });
    table.index(['user_id', 'created_at'], 'chat_saved_message_user_created_idx');
    table.index(['message_id'], 'chat_saved_message_message_idx');
  });
};
