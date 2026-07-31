/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const CONSTRAINT_NAME = 'user_account_notification_level_check';

exports.up = async (knex) => {
  await knex.raw(`
    ALTER TABLE user_account
    DROP CONSTRAINT IF EXISTS ${CONSTRAINT_NAME}
  `);

  await knex.raw(`
    ALTER TABLE user_account
    ADD CONSTRAINT ${CONSTRAINT_NAME}
    CHECK (notification_level IN ('all', 'essential', 'none'))
  `);
};

exports.down = async (knex) => {
  await knex('user_account')
    .where({ notificationLevel: 'none' })
    .update({ notificationLevel: 'essential' });

  await knex.raw(`
    ALTER TABLE user_account
    DROP CONSTRAINT IF EXISTS ${CONSTRAINT_NAME}
  `);

  await knex.raw(`
    ALTER TABLE user_account
    ADD CONSTRAINT ${CONSTRAINT_NAME}
    CHECK (notification_level IN ('all', 'essential'))
  `);
};
