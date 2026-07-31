/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const USER_NOTIFICATION_LEVEL_CONSTRAINT = 'user_account_notification_level_check';
const NOTIFICATION_CARD_SCOPE_CONSTRAINT = 'notification_card_scope_check';

exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.text('notification_level').notNullable().defaultTo('all');
  });

  await knex.raw(`
    ALTER TABLE user_account
    ADD CONSTRAINT ${USER_NOTIFICATION_LEVEL_CONSTRAINT}
    CHECK (notification_level IN ('all', 'essential'))
  `);

  await knex.schema.alterTable('notification', (table) => {
    table.bigInteger('card_id').nullable().alter();
  });

  await knex.raw(`
    ALTER TABLE notification
    ADD CONSTRAINT ${NOTIFICATION_CARD_SCOPE_CONSTRAINT}
    CHECK (
      (type = 'addMemberToBoard' AND card_id IS NULL)
      OR
      (type <> 'addMemberToBoard' AND card_id IS NOT NULL)
    )
  `);
};

exports.down = async (knex) => {
  await knex.raw(`
    ALTER TABLE notification
    DROP CONSTRAINT IF EXISTS ${NOTIFICATION_CARD_SCOPE_CONSTRAINT}
  `);

  await knex('notification').where({ type: 'addMemberToBoard' }).delete();

  await knex.schema.alterTable('notification', (table) => {
    table.bigInteger('card_id').notNullable().alter();
  });

  await knex.raw(`
    ALTER TABLE user_account
    DROP CONSTRAINT IF EXISTS ${USER_NOTIFICATION_LEVEL_CONSTRAINT}
  `);

  await knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('notification_level');
  });
};
