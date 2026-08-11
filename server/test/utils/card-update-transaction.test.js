const { expect } = require('chai');
const lodash = require('lodash');

const updateCard = require('../../api/helpers/cards/update-one');

describe('Card update transaction', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {};
    [
      '_',
      'sails',
      'Card',
      'CardSubscription',
      'CardMembership',
      'CardLabel',
      'TaskList',
      'Task',
      'CustomFieldGroup',
      'CustomField',
      'CustomFieldValue',
      'BaseCustomFieldGroup',
      'Label',
      'List',
      'Action',
    ].forEach((name) => {
      previousGlobals[name] = global[name];
    });

    global._ = lodash;
    global.List = {
      Types: {
        ARCHIVE: 'archive',
        TRASH: 'trash',
      },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  it('rolls back label recreation and repositions when the final card update fails', async () => {
    const originalState = {
      subscriptions: ['user-outside-board'],
      memberships: ['user-outside-board'],
      labels: ['label-1'],
      boardLabels: [],
      cardPositions: {
        'card-2': 200,
      },
      assigneeUserId: 'user-outside-board',
    };
    let committedState = lodash.cloneDeep(originalState);
    let transactionConnection;
    const broadcasts = [];
    const usedConnections = [];

    const deferredMutation = (mutate) => ({
      usingConnection: async (db) => {
        usedConnections.push(db);
        mutate(db.state);
        return [];
      },
    });

    const deleting = (property) => () =>
      deferredMutation((state) => {
        // eslint-disable-next-line no-param-reassign
        state[property] = [];
      });

    global.sails = {
      getDatastore: () => ({
        transaction: async (callback) => {
          const db = {
            state: lodash.cloneDeep(committedState),
          };
          transactionConnection = db;

          const result = await callback(db);
          committedState = db.state;
          return result;
        },
      }),
      helpers: {
        cards: {
          getLabels: async () => [
            {
              id: 'label-1',
              boardId: 'board-1',
              position: 100,
              name: 'Urgent',
              color: 'berry-red',
            },
          ],
        },
        boards: {
          getMemberUserIds: async () => ['board-member'],
        },
        lists: {
          isFinite: () => true,
          isArchiveOrTrash: () => false,
        },
        utils: {
          mapRecords: (records, property = 'id') => records.map((record) => record[property]),
          generateIds: async (count) =>
            Array.from({ length: count }, (_, index) => `generated-${index + 1}`),
          insertToPositionables: (position, records) => ({
            position,
            repositions:
              records.length > 0
                ? [
                    {
                      record: records[0],
                      position: records[0].position + 100,
                    },
                  ]
                : [],
          }),
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };

    global.CardSubscription = { qm: { delete: deleting('subscriptions') } };
    global.CardMembership = { qm: { delete: deleting('memberships') } };
    global.CardLabel = {
      qm: {
        delete: deleting('labels'),
        create: (values) =>
          deferredMutation((state) => {
            // eslint-disable-next-line no-param-reassign
            state.labels = values.map(({ labelId }) => labelId);
          }),
      },
    };
    global.TaskList = { qm: { getByCardId: async () => [{ id: 'task-list-1' }] } };
    global.Task = {
      qm: {
        update: () =>
          deferredMutation((state) => {
            // eslint-disable-next-line no-param-reassign
            state.assigneeUserId = null;
          }),
      },
    };
    global.CustomFieldGroup = {
      qm: {
        getByBoardId: async () => [],
        getByCardId: async () => [],
        create: () => deferredMutation(() => {}),
        update: () => deferredMutation(() => {}),
      },
    };
    global.CustomField = {
      qm: {
        getByCustomFieldGroupIds: async () => [],
        getByBaseCustomFieldGroupIds: async () => [],
        create: () => deferredMutation(() => {}),
      },
    };
    global.CustomFieldValue = {
      qm: {
        getByCardId: async () => [],
      },
    };
    global.BaseCustomFieldGroup = { qm: { getByIds: async () => [] } };
    global.Label = {
      qm: {
        getByBoardId: async () => [],
        createOne: (values) => ({
          usingConnection: async (db) => {
            usedConnections.push(db);
            db.state.boardLabels.push(values.id);
            return values;
          },
        }),
        updateOne: () => deferredMutation(() => {}),
      },
    };
    global.Card = {
      qm: {
        getByListId: async () => [{ id: 'card-2', listId: 'list-2', position: 200 }],
        updateOne: (criteria, updateValues) => ({
          usingConnection: async (db) => {
            usedConnections.push(db);

            if (typeof criteria === 'object') {
              // eslint-disable-next-line no-param-reassign
              db.state.cardPositions[criteria.id] = updateValues.position;
              return { id: criteria.id, ...updateValues };
            }

            throw new Error('simulated card update failure');
          },
        }),
      },
    };

    let error;
    try {
      await updateCard.fn({
        record: { id: 'card-1' },
        values: {
          project: { id: 'project-2' },
          board: { id: 'board-2', projectId: 'project-2' },
          list: { id: 'list-2', boardId: 'board-2', type: 'archive' },
          position: 100,
        },
        project: { id: 'project-1' },
        board: { id: 'board-1', projectId: 'project-1' },
        list: { id: 'list-1', boardId: 'board-1', type: 'archive' },
        actorUser: { id: 'user-1' },
      });
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.have.property('message', 'simulated card update failure');
    expect(committedState).to.deep.equal(originalState);
    expect(usedConnections).to.have.length(11);
    expect(usedConnections.every((connection) => connection === transactionConnection)).to.equal(
      true,
    );
    expect(broadcasts).to.deep.equal([]);
  });

  it('returns the committed card when post-commit activity creation fails', async () => {
    const actionFailure = new Error('activity insert failed');
    const loggedErrors = [];
    const card = {
      id: 'card-1',
      boardId: 'board-1',
      listId: 'list-2',
      name: 'Moved card',
      dueDate: '2026-08-12T10:00:00.000Z',
    };

    global.Action = {
      Types: {
        MOVE_CARD: 'moveCard',
        SET_DUE_DATE: 'setDueDate',
      },
    };
    global.Card = {
      qm: {
        updateOne: async () => card,
      },
    };
    global.sails = {
      helpers: {
        lists: {
          isFinite: () => false,
          isArchiveOrTrash: () => false,
        },
        actions: {
          createOne: {
            with: async () => {
              throw actionFailure;
            },
          },
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
      sockets: {
        broadcast: () => {},
      },
      log: {
        error: (...args) => loggedErrors.push(args),
      },
    };

    const result = await updateCard.fn({
      record: {
        id: 'card-1',
        dueDate: null,
      },
      values: {
        list: { id: 'list-2', boardId: 'board-1', type: 'active', name: 'Next' },
        dueDate: card.dueDate,
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1', boardId: 'board-1', type: 'active', name: 'Previous' },
      actorUser: { id: 'user-1' },
    });

    expect(result).to.equal(card);
    expect(loggedErrors).to.have.lengthOf(2);
    expect(loggedErrors[0][0]).to.include('Failed to create move action for card card-1');
    expect(loggedErrors[1][0]).to.include('Failed to create due date action for card card-1');
  });
});
