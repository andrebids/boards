/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.boolean('must_change_password').notNullable().defaultTo(false);
    table.timestamp('welcome_email_sent_at', true);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('welcome_email_sent_at');
    table.dropColumn('must_change_password');
  });
};
