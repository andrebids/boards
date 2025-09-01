/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

export const saveProjectsOrder = order => ({
  type: ActionTypes.PROJECTS_ORDER_SAVE,
  payload: { order },
});

export const loadProjectsOrder = order => ({
  type: ActionTypes.PROJECTS_ORDER_LOAD,
  payload: { order },
});

export const resetProjectsOrder = () => ({
  type: ActionTypes.PROJECTS_ORDER_RESET,
});

export const saveFavoritesOrder = order => ({
  type: ActionTypes.FAVORITES_ORDER_SAVE,
  payload: { order },
});

export const loadFavoritesOrder = order => ({
  type: ActionTypes.FAVORITES_ORDER_LOAD,
  payload: { order },
});

export const resetFavoritesOrder = () => ({
  type: ActionTypes.FAVORITES_ORDER_RESET,
});
