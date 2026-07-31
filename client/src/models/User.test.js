import User from './User';
import ActionTypes from '../constants/ActionTypes';

describe('User notification preference', () => {
  const reduce = (user, type, payload) => {
    User.reducer(
      {
        type,
        payload,
      },
      {
        upsert: jest.fn(),
        withId: (id) => (id === user.id ? user : null),
      },
    );
  };

  test('updates the preference optimistically and remembers its previous value', () => {
    const user = {
      id: 'user-1',
      notificationLevel: 'all',
      notificationLevelUpdateForm: {
        isSubmitting: false,
        previousValue: null,
        error: null,
      },
      update: jest.fn((data) => Object.assign(user, data)),
    };

    reduce(user, ActionTypes.USER_UPDATE, {
      id: user.id,
      data: {
        notificationLevel: 'essential',
      },
    });

    expect(user.notificationLevel).toBe('essential');
    expect(user.notificationLevelUpdateForm).toEqual({
      isSubmitting: true,
      previousValue: 'all',
      error: null,
    });
  });

  test('restores the previous preference when saving fails', () => {
    const error = new Error('Request failed');
    const user = {
      id: 'user-1',
      notificationLevel: 'essential',
      notificationLevelUpdateForm: {
        isSubmitting: true,
        previousValue: 'all',
        error: null,
      },
      update: jest.fn((data) => Object.assign(user, data)),
    };

    reduce(user, ActionTypes.USER_UPDATE__FAILURE, {
      id: user.id,
      error,
    });

    expect(user.notificationLevel).toBe('all');
    expect(user.notificationLevelUpdateForm).toEqual({
      isSubmitting: false,
      previousValue: null,
      error,
    });
  });

  test('accepts disabling all personal notifications optimistically', () => {
    const user = {
      id: 'user-1',
      notificationLevel: 'essential',
      notificationLevelUpdateForm: {
        isSubmitting: false,
        previousValue: null,
        error: null,
      },
      update: jest.fn((data) => Object.assign(user, data)),
    };

    reduce(user, ActionTypes.USER_UPDATE, {
      id: user.id,
      data: {
        notificationLevel: 'none',
      },
    });

    expect(user.notificationLevel).toBe('none');
    expect(user.notificationLevelUpdateForm.previousValue).toBe('essential');
  });
});
