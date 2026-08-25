/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  isFetching: false,
  isLoaded: false,
  hasMore: true,
  error: null,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.NOTIFICATION_HISTORY_FETCH:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case ActionTypes.NOTIFICATION_HISTORY_FETCH__SUCCESS:
      return {
        ...state,
        isFetching: false,
        isLoaded: true,
        hasMore: payload.hasMore,
      };
    case ActionTypes.NOTIFICATION_HISTORY_FETCH__FAILURE:
      return {
        ...state,
        isFetching: false,
        error: payload.error,
      };
    default:
      return state;
  }
};
