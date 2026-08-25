/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const HISTORY_LIMIT = 30;

module.exports = {
  inputs: {
    isRead: {
      type: 'boolean',
      defaultsTo: false,
    },
    beforeId: idInput,
    limit: {
      type: 'number',
      isInteger: true,
      min: 1,
      max: 50,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let notifications;
    let hasMore = false;

    if (inputs.isRead) {
      const limit = inputs.limit || HISTORY_LIMIT;
      const records = await Notification.qm.getByUserId(currentUser.id, {
        isRead: true,
        beforeId: inputs.beforeId,
        limit: limit + 1,
      });

      hasMore = records.length > limit;
      notifications = hasMore ? records.slice(0, limit) : records;
    } else {
      notifications = await Notification.qm.getUnreadByUserId(currentUser.id);
    }

    const userIds = sails.helpers.utils.mapRecords(notifications, 'creatorUserId', true, true);
    const users = await User.qm.getByIds(userIds);

    return {
      items: notifications,
      included: {
        users: sails.helpers.users.presentMany(users, currentUser),
      },
      ...(inputs.isRead && {
        meta: {
          hasMore,
        },
      }),
    };
  },
};
