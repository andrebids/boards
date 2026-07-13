/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_conversation', (table) => {
    table.text('title');
    table.timestamp('archived_at', { useTz: true });
  });

  await knex.schema.alterTable('chat_participant', (table) => {
    table.text('role').notNullable().defaultTo('member');
  });

  await knex.raw(`
    ALTER TABLE chat_conversation
    DROP CONSTRAINT chat_conversation_type_check,
    DROP CONSTRAINT chat_conversation_direct_key_check,
    ADD CONSTRAINT chat_conversation_type_check
      CHECK (type IN ('projectGroup', 'projectDirect', 'projectCustomGroup')),
    ADD CONSTRAINT chat_conversation_direct_key_check
      CHECK (
        (type = 'projectDirect' AND direct_key IS NOT NULL) OR
        (type IN ('projectGroup', 'projectCustomGroup') AND direct_key IS NULL)
      )
  `);

  await knex.raw(`
    ALTER TABLE chat_participant
    ADD CONSTRAINT chat_participant_role_check
    CHECK (role IN ('owner', 'member'))
  `);
};

exports.down = async (knex) => {
  await knex('chat_conversation').where({ type: 'projectCustomGroup' }).delete();

  await knex.raw(`
    ALTER TABLE chat_conversation
    DROP CONSTRAINT chat_conversation_type_check,
    DROP CONSTRAINT chat_conversation_direct_key_check,
    ADD CONSTRAINT chat_conversation_type_check
      CHECK (type IN ('projectGroup', 'projectDirect')),
    ADD CONSTRAINT chat_conversation_direct_key_check
      CHECK (
        (type = 'projectGroup' AND direct_key IS NULL) OR
        (type = 'projectDirect' AND direct_key IS NOT NULL)
      )
  `);

  await knex.schema.alterTable('chat_participant', (table) => {
    table.dropColumn('role');
  });

  await knex.schema.alterTable('chat_conversation', (table) => {
    table.dropColumn('archived_at');
    table.dropColumn('title');
  });
};
