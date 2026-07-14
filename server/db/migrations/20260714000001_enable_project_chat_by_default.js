/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.raw(`
    ALTER TABLE project
    ALTER COLUMN chat_mode SET DEFAULT 'allProjectMembers'
  `);
};

exports.down = async (knex) => {
  await knex.raw(`
    ALTER TABLE project
    ALTER COLUMN chat_mode SET DEFAULT 'disabled'
  `);
};
