/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('node:assert/strict');

const notificationQueryMethods = require('../../api/hooks/query-methods/models/Notification');

describe('Notification history query', () => {
  let previousNotification;
  let criteria;
  let limit;

  beforeEach(() => {
    previousNotification = global.Notification;
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
});
