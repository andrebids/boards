/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('chat_message_reaction', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('message_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.text('emoji').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('message_id').references('id').inTable('chat_message').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['message_id', 'user_id', 'emoji'], {
      indexName: 'chat_message_reaction_message_user_emoji_unique',
    });
    table.index(['message_id'], 'chat_message_reaction_message_idx');
  });

  await knex.schema.createTable('chat_message_attachment', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('message_id').notNullable();
    table.bigInteger('creator_user_id');
    table.bigInteger('file_reference_id').notNullable();
    table.text('name').notNullable();
    table.jsonb('data').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('message_id').references('id').inTable('chat_message').onDelete('CASCADE');
    table.foreign('creator_user_id').references('id').inTable('user_account').onDelete('SET NULL');
    table
      .foreign('file_reference_id')
      .references('id')
      .inTable('file_reference')
      .onDelete('CASCADE');
    table.index(['message_id'], 'chat_message_attachment_message_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('chat_message_attachment');
  await knex.schema.dropTableIfExists('chat_message_reaction');
};
