/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('node:assert/strict');
const lodash = require('lodash');

const Notification = require('../../api/models/Notification');
const User = require('../../api/models/User');
const createNotification = require('../../api/helpers/notifications/create-one');

describe('Personal notification preferences', () => {
  let previousGlobals;
  let createdNotifications;
  let broadcasts;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      sails: global.sails,
      Notification: global.Notification,
      NotificationService: global.NotificationService,
      User: global.User,
    };

    createdNotifications = [];
    broadcasts = [];

    global._ = lodash;
    global.Notification = {
      ...Notification,
      qm: {
        createOne: async (values) => {
          const notification = {
            id: `notification-${createdNotifications.length + 1}`,
            ...values,
          };

          createdNotifications.push(notification);
          return notification;
        },
      },
    };
    global.NotificationService = {
      qm: {
        getByUserId: async () => [],
      },
    };
    global.User = {
      ...User,
      qm: {
        getOneById: async () => null,
      },
    };
    global.sails = {
      config: {
        custom: {
          globalNotifications: {
            enabled: false,
          },
        },
      },
      hooks: {
        smtp: {
          isEnabled: () => false,
        },
      },
      sockets: {
        broadcast: (...args) => {
          broadcasts.push(args);
        },
      },
      helpers: {
        users: {
          presentOne: (user) => user,
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
      log: {
        debug: () => {},
        error: () => {},
        info: () => {},
        warn: () => {},
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

  it('suppresses non-essential activity before persisting or broadcasting it', async () => {
    const result = await createNotification.fn({
      values: {
        type: Notification.Types.MOVE_CARD,
        data: {},
        user: {
          id: 'recipient',
          notificationLevel: User.NotificationLevels.ESSENTIAL,
        },
        creatorUser: {
          id: 'actor',
          name: 'Actor',
        },
        card: {
          id: 'card-1',
          name: 'Card',
          boardId: 'board-1',
        },
      },
      project: {
        id: 'project-1',
      },
      board: {
        id: 'board-1',
      },
    });

    assert.equal(result, null);
    assert.equal(createdNotifications.length, 0);
    assert.equal(broadcasts.length, 0);
  });

  it('persists an essential board invitation without a card id', async () => {
    const result = await createNotification.fn({
      values: {
        type: Notification.Types.ADD_MEMBER_TO_BOARD,
        data: {
          board: {
            id: 'board-1',
            name: 'Board',
          },
        },
        user: {
          id: 'recipient',
          notificationLevel: User.NotificationLevels.ESSENTIAL,
        },
        creatorUser: {
          id: 'actor',
          name: 'Actor',
        },
      },
      project: {
        id: 'project-1',
      },
      board: {
        id: 'board-1',
        name: 'Board',
      },
    });

    assert.equal(result, createdNotifications[0]);
    assert.equal(result.type, Notification.Types.ADD_MEMBER_TO_BOARD);
    assert.equal(result.cardId, undefined);
    assert.equal(result.boardId, 'board-1');
    assert.equal(broadcasts.length, 1);
  });

  it('suppresses even essential activity when notifications are disabled', async () => {
    const result = await createNotification.fn({
      values: {
        type: Notification.Types.ADD_MEMBER_TO_BOARD,
        data: {
          board: {
            id: 'board-1',
            name: 'Board',
          },
        },
        user: {
          id: 'recipient',
          notificationLevel: User.NotificationLevels.NONE,
        },
        creatorUser: {
          id: 'actor',
          name: 'Actor',
        },
      },
      project: {
        id: 'project-1',
      },
      board: {
        id: 'board-1',
        name: 'Board',
      },
    });

    assert.equal(result, null);
    assert.equal(createdNotifications.length, 0);
    assert.equal(broadcasts.length, 0);
  });

  it('does not send a second mailto notification when central email is enabled', async () => {
    const centralEmails = [];
    const personalServiceBatches = [];

    global.NotificationService.qm.getByUserId = async () => [
      {
        url: 'mailto://legacy-smtp.example.test?to=recipient%40example.test',
        format: 'html',
      },
      {
        url: 'discord://webhook-token',
        format: 'markdown',
      },
    ];
    global.sails.config.custom.baseUrl = 'http://localhost:3008';
    global.sails.config.custom.globalNotifications.enabled = true;
    global.sails.helpers.utils.makeTranslator = () => (key) => key;
    global.sails.helpers.utils.compileEmailTemplate = {
      with: async () => '<html>Central template</html>',
    };
    global.sails.helpers.utils.sendGlobalNotification = {
      with: async (email) => {
        centralEmails.push(email);
      },
    };
    global.sails.helpers.utils.sendNotifications = async (services) => {
      personalServiceBatches.push(services);
    };

    await createNotification.fn({
      values: {
        type: Notification.Types.ADD_MEMBER_TO_BOARD,
        data: {},
        user: {
          id: 'recipient',
          name: 'Recipient',
          email: 'recipient@example.test',
          language: 'pt-PT',
          notificationLevel: User.NotificationLevels.ALL,
        },
        creatorUser: {
          id: 'actor',
          name: 'Actor',
        },
      },
      project: {
        id: 'project-1',
        name: 'Project',
      },
      board: {
        id: 'board-1',
        name: 'Board',
      },
    });

    assert.equal(centralEmails.length, 1);
    assert.deepEqual(personalServiceBatches, [
      [
        {
          url: 'discord://webhook-token',
          format: 'markdown',
        },
      ],
    ]);
  });
});
