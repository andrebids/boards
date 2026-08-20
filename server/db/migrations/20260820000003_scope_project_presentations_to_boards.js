/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const TABLE_NAME = 'project_presentation';

exports.up = async (knex) => {
  const hasBoardId = await knex.schema.hasColumn(TABLE_NAME, 'board_id');

  if (hasBoardId) {
    return;
  }

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.dropUnique(['project_id']);
    table.bigInteger('board_id');
  });

  const presentations = await knex(TABLE_NAME).select('id', 'project_id');

  await Promise.all(
    presentations.map(async (presentation) => {
      const board = await knex('board')
        .select('id')
        .where({ project_id: presentation.project_id })
        .orderBy([
          { column: 'position', order: 'asc' },
          { column: 'id', order: 'asc' },
        ])
        .first();

      if (board) {
        await knex(TABLE_NAME).where({ id: presentation.id }).update({ board_id: board.id });
      }
    }),
  );

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.unique('board_id');
    table.foreign('board_id').references('id').inTable('board').onDelete('CASCADE');
  });
};

exports.down = async (knex) => {
  const hasBoardId = await knex.schema.hasColumn(TABLE_NAME, 'board_id');

  if (!hasBoardId) {
    return;
  }

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.dropForeign(['board_id']);
    table.dropUnique(['board_id']);
    table.dropColumn('board_id');
  });
};
