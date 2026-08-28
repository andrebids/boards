/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_participant', (table) => {
    table.bigInteger('history_cleared_through_message_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('chat_participant', (table) => {
    table.dropColumn('history_cleared_through_message_id');
  });
};
