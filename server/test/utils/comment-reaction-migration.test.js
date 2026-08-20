/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');

const migration = require('../../db/migrations/20260820000001_add_comment_reaction_updated_at');

const createKnex = (hasUpdatedAt) => {
  const operations = [];
  const table = {
    timestamp: (columnName, options) => operations.push(['timestamp', columnName, options]),
    dropColumn: (columnName) => operations.push(['dropColumn', columnName]),
  };

  return {
    operations,
    schema: {
      hasColumn: async (tableName, columnName) => {
        operations.push(['hasColumn', tableName, columnName]);
        return hasUpdatedAt;
      },
      alterTable: async (tableName, callback) => {
        operations.push(['alterTable', tableName]);
        callback(table);
      },
    },
  };
};

describe('Comment reaction updated-at migration', () => {
  it('adds the timestamp required by the CommentReaction model', async () => {
    const knex = createKnex(false);

    await migration.up(knex);

    expect(knex.operations).to.deep.equal([
      ['hasColumn', 'comment_reaction', 'updated_at'],
      ['alterTable', 'comment_reaction'],
      ['timestamp', 'updated_at', { useTz: true }],
    ]);
  });

  it('is safe when the timestamp already exists', async () => {
    const knex = createKnex(true);

    await migration.up(knex);

    expect(knex.operations).to.deep.equal([['hasColumn', 'comment_reaction', 'updated_at']]);
  });

  it('removes the timestamp on rollback', async () => {
    const knex = createKnex(true);

    await migration.down(knex);

    expect(knex.operations).to.deep.equal([
      ['hasColumn', 'comment_reaction', 'updated_at'],
      ['alterTable', 'comment_reaction'],
      ['dropColumn', 'updated_at'],
    ]);
  });
});
