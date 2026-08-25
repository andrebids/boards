import Notification from './Notification';
import ActionTypes from '../constants/ActionTypes';

describe('Notification read state', () => {
  const reduce = (notification, type, payload) => {
    Notification.reducer(
      {
        type,
        payload,
      },
      {
        all: () => ({
          toModelArray: () => [notification],
        }),
        upsert: jest.fn(),
        withId: (id) => (id === notification.id ? notification : null),
      },
    );
  };

  test('keeps a notification in the client store when it is marked as read', () => {
    const notification = {
      id: 'notification-1',
      isRead: false,
      delete: jest.fn(),
      update: jest.fn((data) => Object.assign(notification, data)),
    };

    reduce(notification, ActionTypes.NOTIFICATION_DELETE, {
      id: notification.id,
    });

    expect(notification.isRead).toBe(true);
    expect(notification.delete).not.toHaveBeenCalled();
  });

  test('keeps a notification when a read update arrives through the socket', () => {
    const notification = {
      id: 'notification-1',
      isRead: false,
      delete: jest.fn(),
      update: jest.fn((data) => Object.assign(notification, data)),
    };

    reduce(notification, ActionTypes.NOTIFICATION_DELETE_HANDLE, {
      notification: {
        id: notification.id,
        isRead: true,
      },
    });

    expect(notification.isRead).toBe(true);
    expect(notification.delete).not.toHaveBeenCalled();
  });
});
