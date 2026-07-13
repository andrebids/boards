/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../../constants/ActionTypes';

const initialState = {
  data: {
    email: '',
    name: '',
    language: 'pt-PT',
  },
  isSubmitting: false,
  error: null,
  createdUserId: null,
  welcomeEmailSent: null,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.USER_CREATE:
      return {
        ...state,
        data: {
          ...state.data,
          ...payload.data,
        },
        isSubmitting: true,
      };
    case ActionTypes.USER_CREATE__SUCCESS:
      return {
        ...initialState,
        createdUserId: payload.user.id,
        welcomeEmailSent: payload.welcomeEmailSent,
      };
    case ActionTypes.USER_CREATE__FAILURE:
      return {
        ...state,
        isSubmitting: false,
        error: payload.error,
      };
    case ActionTypes.USER_CREATE_ERROR_CLEAR:
      if (state.createdUserId) {
        return initialState;
      }

      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};
