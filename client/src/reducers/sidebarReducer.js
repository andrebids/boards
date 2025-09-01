/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  isExpanded: false,
  projectsOrder: null, // null = ordenação padrão, array = ordenação personalizada
  favoritesOrder: null, // null = ordenação padrão, array = ordenação personalizada
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.SIDEBAR_TOGGLE:
      return {
        ...state,
        isExpanded: !state.isExpanded,
      };
    case ActionTypes.SIDEBAR_EXPANDED_SET:
      return {
        ...state,
        isExpanded: payload.isExpanded,
      };
    case ActionTypes.PROJECTS_ORDER_SAVE:
      return {
        ...state,
        projectsOrder: payload.order,
      };
    case ActionTypes.PROJECTS_ORDER_LOAD:
      return {
        ...state,
        projectsOrder: payload.order,
      };
    case ActionTypes.PROJECTS_ORDER_RESET:
      return {
        ...state,
        projectsOrder: null,
      };
    case ActionTypes.FAVORITES_ORDER_SAVE:
      return {
        ...state,
        favoritesOrder: payload.order,
      };
    case ActionTypes.FAVORITES_ORDER_LOAD:
      return {
        ...state,
        favoritesOrder: payload.order,
      };
    case ActionTypes.FAVORITES_ORDER_RESET:
      return {
        ...state,
        favoritesOrder: null,
      };
    default:
      return state;
  }
};
