/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const duplicateCard = require('../../api/helpers/cards/duplicate-one');

const makeDeferred = (execute) => ({
  usingConnection: (connection) => execute(connection),
});

describe('Card duplication transaction', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      sails: global.sails,
      Card: global.Card,
      CardMembership: global.CardMembership,
      CardLabel: global.CardLabel,
      TaskList: global.TaskList,
      Task: global.Task,
      CustomFieldGroup: global.CustomFieldGroup,
      CustomField: global.CustomField,
      CustomFieldValue: global.CustomFieldValue,
      CardSubscription: global.CardSubscription,
      Action: global.Action,
    };

    global._ = lodash;
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

  const setUp = ({ failCustomFieldValues = false, failAction = false } = {}) => {
    const db = { id: 'card-duplicate-transaction' };
    const pendingWrites = [];
    const committedWrites = [];
    const usedConnections = [];
    const broadcasts = [];
    const loggedErrors = [];
    let webhookCalls = 0;
    let actionCalls = 0;
    let createdCard;

    const write = (name, result) =>
      makeDeferred(async (connection) => {
        usedConnections.push(connection);
        pendingWrites.push(name);
        return result;
      });

    global.Card = {
      qm: {
        getByListId: async () => [{ id: 'card-existing', listId: 'list-1', position: 1 }],
        updateOne: (criteria, values) => {
          const id = typeof criteria === 'string' ? criteria : criteria.id;
          return write(`card:update:${id}`, {
            ...(createdCard && id === createdCard.id ? createdCard : { id }),
            ...values,
          });
        },
        createOne: (values) => {
          createdCard = { id: 'card-copy', ...values };
          return write('card:create', createdCard);
        },
      },
    };
    global.CardMembership = {
      qm: {
        getByCardId: async () => [{ id: 'membership-1', userId: 'member-1' }],
        create: (values) => write('memberships:create', values),
      },
    };
    global.CardLabel = {
      qm: {
        getByCardId: async () => [{ id: 'card-label-1', labelId: 'label-1' }],
        create: (values) => write('labels:create', values),
      },
    };
    global.TaskList = {
      qm: {
        getByCardId: async () => [{ id: 'task-list-1', position: 1, name: 'Tasks' }],
        create: (values) => write('task-lists:create', values),
      },
    };
    global.Task = {
      qm: {
        getByTaskListIds: async () => [
          { id: 'task-1', taskListId: 'task-list-1', position: 1, name: 'Task' },
        ],
        create: (values) => write('tasks:create', values),
      },
    };
    global.CustomFieldGroup = {
      qm: {
        getByCardId: async () => [{ id: 'group-1', position: 1, name: 'Group' }],
        create: (values) => write('custom-field-groups:create', values),
      },
    };
    global.CustomField = {
      qm: {
        getByCustomFieldGroupIds: async () => [
          { id: 'field-1', customFieldGroupId: 'group-1', position: 1, name: 'Field' },
        ],
        create: (values) => write('custom-fields:create', values),
      },
    };
    global.CustomFieldValue = {
      qm: {
        getByCardId: async () => [
          {
            id: 'value-1',
            cardId: 'card-source',
            customFieldGroupId: 'group-1',
            customFieldId: 'field-1',
            content: 'Value',
          },
        ],
        create: (values) =>
          makeDeferred(async (connection) => {
            usedConnections.push(connection);
            pendingWrites.push('custom-field-values:create');
            if (failCustomFieldValues) {
              throw new Error('custom field value insert failed');
            }
            return values;
          }),
      },
    };
    global.CardSubscription = {
      qm: {
        createOne: (values) => write('subscription:create', values),
      },
    };
    global.Action = { Types: { CREATE_CARD: 'createCard' } };

    global.sails = {
      getDatastore: () => ({
        transaction: async (callback) => {
          try {
            const result = await callback(db);
            committedWrites.push(...pendingWrites);
            return result;
          } catch (error) {
            pendingWrites.length = 0;
            throw error;
          }
        },
      }),
      helpers: {
        lists: { isFinite: () => true },
        utils: {
          insertToPositionables: () => ({
            position: 2,
            repositions: [
              {
                record: { id: 'card-existing', listId: 'list-1' },
                position: 3,
              },
            ],
          }),
          mapRecords: (records) => records.map(({ id }) => id),
          generateIds: async () => [
            'task-list-copy',
            'attachment-copy',
            'group-copy',
            'field-copy',
          ],
          sendWebhooks: {
            with: () => {
              webhookCalls += 1;
            },
          },
        },
        attachments: { presentMany: (records) => records },
        actions: {
          createOne: {
            with: async () => {
              actionCalls += 1;
              if (failAction) {
                throw new Error('action side effect failed');
              }
            },
          },
        },
      },
      models: {
        attachment: {
          qm: {
            getByCardId: async () => [
              {
                id: 'attachment-1',
                type: 'link',
                data: { url: 'https://example.com' },
                name: 'Link',
              },
            ],
            create: async (values, { connection }) => {
              usedConnections.push(connection);
              pendingWrites.push('attachments:create');
              return values;
            },
          },
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
      log: {
        error: (...args) => loggedErrors.push(args),
      },
    };

    return {
      db,
      committedWrites,
      usedConnections,
      broadcasts,
      loggedErrors,
      getWebhookCalls: () => webhookCalls,
      getActionCalls: () => actionCalls,
    };
  };

  const inputs = {
    record: {
      id: 'card-source',
      boardId: 'board-1',
      listId: 'list-1',
      type: 'project',
      name: 'Source card',
      coverAttachmentId: 'attachment-1',
    },
    values: {
      name: 'Copy',
      position: 2,
      creatorUser: {
        id: 'user-1',
        subscribeToOwnCards: true,
      },
    },
    project: { id: 'project-1' },
    board: { id: 'board-1' },
    list: { id: 'list-1', type: 'active', name: 'List' },
  };

  it('rolls back all writes and publishes no events when a late copy step fails', async () => {
    const state = setUp({ failCustomFieldValues: true });

    let error;
    try {
      await duplicateCard.fn(inputs);
    } catch (nextError) {
      error = nextError;
    }

    expect(error).to.be.an('error').with.property('message', 'custom field value insert failed');
    expect(state.committedWrites).to.deep.equal([]);
    expect(state.broadcasts).to.deep.equal([]);
    expect(state.getWebhookCalls()).to.equal(0);
    expect(state.getActionCalls()).to.equal(0);
    expect(state.usedConnections).to.have.length.greaterThan(0);
    expect(state.usedConnections.every((connection) => connection === state.db)).to.equal(true);
  });

  it('returns the committed duplicate when post-commit action creation fails', async () => {
    const state = setUp({ failAction: true });

    const result = await duplicateCard.fn(inputs);

    expect(result.card.id).to.equal('card-copy');
    expect(state.committedWrites).to.include.members([
      'card:create',
      'attachments:create',
      'custom-field-values:create',
      'subscription:create',
    ]);
    expect(state.broadcasts).to.have.length.greaterThan(0);
    expect(state.getWebhookCalls()).to.equal(1);
    expect(state.getActionCalls()).to.equal(1);
    expect(state.loggedErrors).to.have.length(1);
  });
});
