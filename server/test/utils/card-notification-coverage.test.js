/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const Action = require('../../api/models/Action');
const Notification = require('../../api/models/Notification');
const createAction = require('../../api/helpers/actions/create-one');

describe('Card notification coverage', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      sails: global.sails,
      NotificationService: global.NotificationService,
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

  it('allows every subscriber-facing card activity to be persisted as a notification', () => {
    const expectedTypes = [
      Action.Types.CREATE_CARD,
      Action.Types.MOVE_CARD,
      Action.Types.CREATE_TASK,
      Action.Types.DELETE_TASK,
      Action.Types.UPDATE_TASK,
      Action.Types.COMPLETE_TASK,
      Action.Types.UNCOMPLETE_TASK,
      Action.Types.CREATE_TASK_LIST,
      Action.Types.DELETE_TASK_LIST,
      Action.Types.ADD_LABEL_TO_CARD,
      Action.Types.REMOVE_LABEL_FROM_CARD,
      Action.Types.SET_DUE_DATE,
    ];

    expect(Action.INTERNAL_NOTIFIABLE_TYPES).to.include.members(expectedTypes);
    expect(Object.values(Notification.Types)).to.include.members(expectedTypes);
  });

  it('notifies card and board followers when a task is created', async () => {
    const notificationInputs = [];
    const cardSubscriptionCalls = [];
    const boardSubscriptionCalls = [];

    global.NotificationService = {
      qm: {
        getByBoardId: async () => [],
      },
    };

    global.sails = {
      models: {
        action: {
          ...Action,
          qm: {
            createOne: async (values) => ({
              id: 'action-1',
              ...values,
            }),
          },
        },
      },
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        boards: {
          getSubscriptionUserIds: async (...args) => {
            boardSubscriptionCalls.push(args);
            return ['board-follower', 'shared-follower'];
          },
        },
        cards: {
          getSubscriptionUserIds: async (...args) => {
            cardSubscriptionCalls.push(args);
            return ['card-follower', 'shared-follower'];
          },
        },
        notifications: {
          createOne: {
            with: async (inputs) => {
              notificationInputs.push(inputs);
            },
          },
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
    };

    await createAction.fn({
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      values: {
        type: Action.Types.CREATE_TASK,
        data: {
          task: {
            id: 'task-1',
            name: 'Review notifications',
          },
        },
        user: {
          id: 'actor',
          name: 'Actor',
        },
        card: {
          id: 'card-1',
          boardId: 'board-1',
          name: 'Card',
        },
      },
    });

    expect(cardSubscriptionCalls).to.deep.equal([['card-1', 'actor']]);
    expect(boardSubscriptionCalls).to.deep.equal([['board-1', 'actor']]);
    expect(notificationInputs.map(({ values }) => values.userId)).to.have.members([
      'card-follower',
      'board-follower',
      'shared-follower',
    ]);
    expect(notificationInputs).to.have.lengthOf(3);
  });
});
