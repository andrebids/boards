/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('node:assert/strict');

const notificationQueryMethods = require('../../api/hooks/query-methods/models/Notification');
const notificationIndex = require('../../api/controllers/notifications/index');

describe('Notification history query', () => {
  let previousNotification;
  let previousSails;
  let previousUser;
  let criteria;
  let limit;

  beforeEach(() => {
    previousNotification = global.Notification;
    previousSails = global.sails;
    previousUser = global.User;
    criteria = null;
    limit = null;

    global.Notification = {
      find: (nextCriteria) => {
        criteria = nextCriteria;

        return {
          sort: () => ({
            limit: (nextLimit) => {
              limit = nextLimit;
              return [];
            },
          }),
        };
      },
    };
  });

  afterEach(() => {
    if (previousNotification === undefined) {
      delete global.Notification;
    } else {
      global.Notification = previousNotification;
    }

    if (previousSails === undefined) {
      delete global.sails;
    } else {
      global.sails = previousSails;
    }

    if (previousUser === undefined) {
      delete global.User;
    } else {
      global.User = previousUser;
    }
  });

  it('queries a current user read history page before a notification id', () => {
    notificationQueryMethods.getByUserId('user-1', {
      isRead: true,
      beforeId: 'notification-50',
      limit: 31,
    });

    assert.deepEqual(criteria, {
      userId: 'user-1',
      isRead: true,
      id: {
        '<': 'notification-50',
      },
    });
    assert.equal(limit, 31);
  });

  it('returns a read history page with a continuation indicator', async () => {
    const records = Array.from({ length: 31 }, (_, index) => ({
      id: `notification-${31 - index}`,
      creatorUserId: 'user-2',
      isRead: true,
    }));
    let queryInputs;

    global.Notification = {
      qm: {
        getByUserId: async (...inputs) => {
          queryInputs = inputs;
          return records;
        },
      },
    };
    global.User = {
      qm: {
        getByIds: async () => [{ id: 'user-2', name: 'Creator' }],
      },
    };
    global.sails = {
      helpers: {
        users: {
          presentMany: (users) => users,
        },
        utils: {
          mapRecords: (items, key) => items.map((item) => item[key]),
        },
      },
    };

    const result = await notificationIndex.fn.call(
      {
        req: {
          currentUser: {
            id: 'user-1',
          },
        },
      },
      {
        isRead: true,
      },
    );

    assert.deepEqual(queryInputs, [
      'user-1',
      {
        isRead: true,
        beforeId: undefined,
        limit: 31,
      },
    ]);
    assert.equal(result.items.length, 30);
    assert.equal(result.meta.hasMore, true);
    assert.deepEqual(result.included.users, [{ id: 'user-2', name: 'Creator' }]);
  });
});
