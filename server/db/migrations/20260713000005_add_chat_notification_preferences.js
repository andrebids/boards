/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_participant', (table) => {
    table.text('notification_level').notNullable().defaultTo('all');
    table.timestamp('muted_until', { useTz: true });
  });

  await knex.raw(`
    UPDATE chat_participant
    SET notification_level = CASE WHEN is_muted THEN 'none' ELSE 'all' END
  `);

  await knex.raw(`
    ALTER TABLE chat_participant
    ADD CONSTRAINT chat_participant_notification_level_check
    CHECK (notification_level IN ('all', 'mentions', 'none'))
  `);
};

exports.down = async (knex) => {
  await knex.schema.alterTable('chat_participant', (table) => {
    table.dropColumn('muted_until');
    table.dropColumn('notification_level');
  });
};
