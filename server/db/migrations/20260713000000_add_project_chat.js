/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.text('chat_mode').notNullable().defaultTo('disabled');
  });

  await knex.raw(`
    ALTER TABLE project
    ADD CONSTRAINT project_chat_mode_check
    CHECK (chat_mode IN ('disabled', 'managers', 'allProjectMembers'))
  `);

  await knex.schema.createTable('chat_conversation', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.text('type').notNullable();
    table.bigInteger('created_by_user_id');
    table.text('direct_key');
    table.timestamp('last_message_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
    table
      .foreign('created_by_user_id')
      .references('id')
      .inTable('user_account')
      .onDelete('SET NULL');
    table.index(['project_id', 'last_message_at'], 'chat_conversation_project_last_message_idx');
  });

  await knex.raw(`
    ALTER TABLE chat_conversation
    ADD CONSTRAINT chat_conversation_type_check
    CHECK (type IN ('projectGroup', 'projectDirect')),
    ADD CONSTRAINT chat_conversation_direct_key_check
    CHECK (
      (type = 'projectGroup' AND direct_key IS NULL) OR
      (type = 'projectDirect' AND direct_key IS NOT NULL)
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX chat_conversation_project_group_unique
    ON chat_conversation (project_id)
    WHERE type = 'projectGroup'
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX chat_conversation_project_direct_unique
    ON chat_conversation (project_id, direct_key)
    WHERE type = 'projectDirect'
  `);

  await knex.schema.createTable('chat_message', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('conversation_id').notNullable();
    table.bigInteger('user_id');
    table.text('text').notNullable();
    table.timestamp('edited_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table
      .foreign('conversation_id')
      .references('id')
      .inTable('chat_conversation')
      .onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('SET NULL');
    table.index(['conversation_id', 'id'], 'chat_message_conversation_id_idx');
    table.index(['conversation_id', 'created_at'], 'chat_message_conversation_created_at_idx');
    table.index(['user_id'], 'chat_message_user_idx');
  });

  await knex.schema.createTable('chat_participant', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('conversation_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('last_read_message_id');
    table.timestamp('last_read_at', { useTz: true });
    table.boolean('is_muted').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table
      .foreign('conversation_id')
      .references('id')
      .inTable('chat_conversation')
      .onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table
      .foreign('last_read_message_id')
      .references('id')
      .inTable('chat_message')
      .onDelete('SET NULL');
    table.unique(['conversation_id', 'user_id'], {
      indexName: 'chat_participant_conversation_user_unique',
    });
    table.index(['user_id'], 'chat_participant_user_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('chat_participant');
  await knex.schema.dropTableIfExists('chat_message');
  await knex.schema.dropTableIfExists('chat_conversation');

  await knex.schema.alterTable('project', (table) => {
    table.dropColumn('chat_mode');
  });
};
