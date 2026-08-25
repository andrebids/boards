import { call, put } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import request from '../request';
import { fetchNotificationHistory } from './notifications';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    getReadNotifications: jest.fn(),
  },
}));
jest.mock('../../../constants/Config', () => ({
  __esModule: true,
  default: {
    ACTIVITIES_LIMIT: 10,
    CARDS_LIMIT: 50,
    COMMENTS_LIMIT: 50,
    POSITION_GAP: 65536,
  },
}));
jest.mock('../../../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));

describe('notification history services', () => {
  test('loads a page of read notifications with included users', () => {
    const generator = fetchNotificationHistory('notification-31');

    expect(generator.next().value).toEqual(
      put(actions.fetchNotificationHistory('notification-31')),
    );
    expect(generator.next().value).toEqual(
      call(request, api.getReadNotifications, {
        beforeId: 'notification-31',
      }),
    );

    const body = {
      items: [{ id: 'notification-30', isRead: true }],
      included: { users: [{ id: 'user-2' }] },
      meta: { hasMore: true },
    };

    expect(generator.next(body).value).toEqual(
      put(actions.fetchNotificationHistory.success(body.items, body.included.users, true)),
    );
    expect(generator.next().done).toBe(true);
  });
});
