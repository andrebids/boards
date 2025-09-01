/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  isExpanded: false,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.TIMELINE_PANEL_TOGGLE:
      return {
        ...state,
        isExpanded: !state.isExpanded,
      };
    case ActionTypes.TIMELINE_PANEL_SET_EXPANDED:
      return {
        ...state,
        isExpanded: payload.isExpanded,
      };
    default:
      return state;
  }
};
