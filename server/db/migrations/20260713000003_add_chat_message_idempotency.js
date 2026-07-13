/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_message', (table) => {
    table.string('client_message_id', 128);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX chat_message_client_id_unique
    ON chat_message (conversation_id, user_id, client_message_id)
    WHERE client_message_id IS NOT NULL
  `);
};

exports.down = async (knex) => {
  await knex.schema.alterTable('chat_message', (table) => {
    table.dropColumn('client_message_id');
  });
};
