/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_message', (table) => {
    table.bigInteger('reply_to_message_id');
    table.bigInteger('forwarded_from_message_id');
    table.bigInteger('forwarded_from_user_id');

    table
      .foreign('reply_to_message_id')
      .references('id')
      .inTable('chat_message')
      .onDelete('SET NULL');
    table
      .foreign('forwarded_from_message_id')
      .references('id')
      .inTable('chat_message')
      .onDelete('SET NULL');
    table
      .foreign('forwarded_from_user_id')
      .references('id')
      .inTable('user_account')
      .onDelete('SET NULL');

    table.index(['reply_to_message_id'], 'chat_message_reply_to_idx');
    table.index(['forwarded_from_message_id'], 'chat_message_forwarded_from_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('chat_message', (table) => {
    table.dropColumn('reply_to_message_id');
    table.dropColumn('forwarded_from_message_id');
    table.dropColumn('forwarded_from_user_id');
  });
};
