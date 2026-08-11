/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const deleteCard = require('../../api/helpers/cards/delete-one');
const deleteCardRelated = require('../../api/helpers/cards/delete-related');

const createQuery = (result, connections, error) => ({
  usingConnection(connection) {
    connections.push(connection);
    return error ? Promise.reject(error) : Promise.resolve(result);
  },
  then(resolve, reject) {
    return (error ? Promise.reject(error) : Promise.resolve(result)).then(resolve, reject);
  },
});

describe('Card deletion transaction', () => {
  const globalNames = [
    '_',
    'sails',
    'Action',
    'Card',
    'CardLabel',
    'CardMembership',
    'CardSubscription',
    'Comment',
    'CustomFieldGroup',
    'TaskList',
  ];

  let previousGlobals;

  beforeEach(() => {
    previousGlobals = Object.fromEntries(globalNames.map((name) => [name, global[name]]));
    global._ = lodash;
  });

  afterEach(() => {
    globalNames.forEach((name) => {
      if (previousGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = previousGlobals[name];
      }
    });
  });

  it('uses the caller transaction for every directly deleted relation', async () => {
    const db = { id: 'card-delete-transaction' };
    const connections = [];
    const relatedConnections = [];
    const queryMethod = (result = []) => ({
      delete: () => createQuery(result, connections),
    });

    global.CardSubscription = { qm: queryMethod() };
    global.CardMembership = { qm: queryMethod() };
    global.CardLabel = { qm: queryMethod() };
    global.TaskList = { qm: queryMethod([{ id: 'task-list-1' }]) };
    global.CustomFieldGroup = { qm: queryMethod([{ id: 'field-group-1' }]) };
    global.Comment = {
      destroy: () => ({
        fetch: () => createQuery([], connections),
      }),
    };
    global.Action = { qm: queryMethod() };
    global.sails = {
      models: {
        attachment: {
          qm: {
            delete: async (criteria, options) => {
              expect(criteria).to.deep.equal({ cardId: 'card-1' });
              relatedConnections.push(options.connection);
              return { fileReferences: [{ id: 'file-reference-1', total: null }] };
            },
          },
        },
      },
      helpers: {
        utils: {
          mapRecords: (records) => records.map(({ id }) => id),
        },
        taskLists: {
          deleteRelated: {
            with: async ({ connection }) => relatedConnections.push(connection),
          },
        },
        customFieldGroups: {
          deleteRelated: {
            with: async ({ connection }) => relatedConnections.push(connection),
          },
        },
      },
    };

    const result = await deleteCardRelated.fn({
      recordOrRecords: { id: 'card-1' },
      connection: db,
    });

    expect(connections).to.have.lengthOf(7);
    expect(connections.every((connection) => connection === db)).to.equal(true);
    expect(relatedConnections).to.deep.equal([db, db, db]);
    expect(result.fileReferences).to.deep.equal([{ id: 'file-reference-1', total: null }]);
  });

  it('does not publish events or remove files when the transaction fails', async () => {
    const db = { id: 'card-delete-transaction' };
    const failure = new Error('card delete failed');
    let cleanupCalls = 0;
    let broadcastCalls = 0;
    let webhookCalls = 0;

    global.Card = {
      qm: {
        deleteOne: () => createQuery(null, [], failure),
      },
    };
    global.sails = {
      getDatastore: () => ({
        transaction: (callback) => callback(db),
      }),
      helpers: {
        cards: {
          deleteRelated: {
            with: async ({ connection }) => {
              expect(connection).to.equal(db);
              return { fileReferences: [{ id: 'file-reference-1', total: null }] };
            },
          },
        },
        attachments: {
          removeUnreferencedFiles: () => {
            cleanupCalls += 1;
          },
        },
        utils: {
          sendWebhooks: {
            with: () => {
              webhookCalls += 1;
            },
          },
        },
      },
      sockets: {
        broadcast: () => {
          broadcastCalls += 1;
        },
      },
    };

    let caughtError;
    try {
      await deleteCard.fn({
        record: { id: 'card-1' },
        project: {},
        board: {},
        list: {},
        actorUser: {},
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.equal(failure);
    expect(cleanupCalls).to.equal(0);
    expect(broadcastCalls).to.equal(0);
    expect(webhookCalls).to.equal(0);
  });

  it('rolls back related deletions when the card no longer exists', async () => {
    const db = { id: 'card-delete-transaction' };
    let transactionRolledBack = false;
    let cleanupCalls = 0;

    global.Card = {
      qm: {
        deleteOne: () => createQuery(null, []),
      },
    };
    global.sails = {
      getDatastore: () => ({
        transaction: async (callback) => {
          try {
            return await callback(db);
          } catch (error) {
            transactionRolledBack = true;
            throw error;
          }
        },
      }),
      helpers: {
        cards: {
          deleteRelated: {
            with: async () => ({
              fileReferences: [{ id: 'file-reference-1', total: null }],
            }),
          },
        },
        attachments: {
          removeUnreferencedFiles: () => {
            cleanupCalls += 1;
          },
        },
      },
    };

    const result = await deleteCard.fn({
      record: { id: 'card-1' },
      project: {},
      board: {},
      list: {},
      actorUser: {},
    });

    expect(result).to.equal(null);
    expect(transactionRolledBack).to.equal(true);
    expect(cleanupCalls).to.equal(0);
  });
});
