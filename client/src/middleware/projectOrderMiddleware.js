/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const STORAGE_KEY = 'planka_projects_order';
const FAVORITES_STORAGE_KEY = 'planka_favorites_order';

export const projectOrderMiddleware = store => next => action => {
  const result = next(action);

  switch (action.type) {
    case ActionTypes.PROJECTS_ORDER_SAVE:
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload.order));
      } catch (error) {
        console.warn('Erro ao salvar ordenação:', error);
      }
      break;

    case ActionTypes.PROJECTS_ORDER_RESET:
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Erro ao remover ordenação:', error);
      }
      break;
    case ActionTypes.FAVORITES_ORDER_SAVE:
      try {
        localStorage.setItem(
          FAVORITES_STORAGE_KEY,
          JSON.stringify(action.payload.order)
        );
      } catch (error) {
        console.warn('Erro ao salvar ordenação de favoritos:', error);
      }
      break;
    case ActionTypes.FAVORITES_ORDER_RESET:
      try {
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
      } catch (error) {
        console.warn('Erro ao remover ordenação de favoritos:', error);
      }
      break;

    default:
      break;
  }

  return result;
};
