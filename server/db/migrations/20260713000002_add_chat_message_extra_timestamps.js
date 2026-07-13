/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  const hasReactionUpdatedAt = await knex.schema.hasColumn('chat_message_reaction', 'updated_at');
  if (!hasReactionUpdatedAt) {
    await knex.schema.alterTable('chat_message_reaction', (table) => {
      table.timestamp('updated_at', { useTz: true });
    });
  }
};

exports.down = async (knex) => {
  const hasReactionUpdatedAt = await knex.schema.hasColumn('chat_message_reaction', 'updated_at');
  if (hasReactionUpdatedAt) {
    await knex.schema.alterTable('chat_message_reaction', (table) => {
      table.dropColumn('updated_at');
    });
  }
};
