/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_message_attachment', (table) => {
    table.string('client_attachment_id', 128);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX chat_message_attachment_message_client_unique
    ON chat_message_attachment (message_id, client_attachment_id)
    WHERE client_attachment_id IS NOT NULL
  `);
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS chat_message_attachment_message_client_unique');
  await knex.schema.alterTable('chat_message_attachment', (table) => {
    table.dropColumn('client_attachment_id');
  });
};
