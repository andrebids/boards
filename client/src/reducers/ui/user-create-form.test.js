import ActionTypes from '../../constants/ActionTypes';
import reducer from './user-create-form';

describe('user create form reducer', () => {
  it('keeps the created user available when the welcome email fails', () => {
    const state = reducer(undefined, {
      type: ActionTypes.USER_CREATE__SUCCESS,
      payload: {
        user: { id: '42' },
        welcomeEmailSent: false,
      },
    });

    expect(state).toMatchObject({
      createdUserId: '42',
      welcomeEmailSent: false,
      isSubmitting: false,
    });
  });

  it('clears a completed creation when the popup closes', () => {
    const state = reducer(
      {
        data: { name: '', email: '', language: 'pt-PT' },
        isSubmitting: false,
        error: null,
        createdUserId: '42',
        welcomeEmailSent: false,
      },
      {
        type: ActionTypes.USER_CREATE_ERROR_CLEAR,
        payload: {},
      },
    );

    expect(state.createdUserId).toBeNull();
    expect(state.welcomeEmailSent).toBeNull();
    expect(state.data.language).toBe('pt-PT');
  });
});
