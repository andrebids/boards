/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createReducer } from 'redux-orm';

import orm from '../orm';
import ActionTypes from '../constants/ActionTypes';

const baseReducer = createReducer(orm);
const OPERATIONS_KEY = 'cardOperations';

const getCardId = ({ type, payload }) => {
  switch (type) {
    case ActionTypes.CARD_UPDATE:
    case ActionTypes.CARD_UPDATE__FAILURE:
    case ActionTypes.CARD_DELETE:
    case ActionTypes.CARD_DELETE__FAILURE:
      return payload.id;
    case ActionTypes.CARD_UPDATE__SUCCESS:
    case ActionTypes.CARD_UPDATE_HANDLE:
    case ActionTypes.CARD_DELETE__SUCCESS:
    case ActionTypes.CARD_DELETE_HANDLE:
      return payload.card.id;
    default:
      return null;
  }
};

const isCardOperationStart = (type) =>
  type === ActionTypes.CARD_UPDATE || type === ActionTypes.CARD_DELETE;

const isCardOperationResult = (type) =>
  type === ActionTypes.CARD_UPDATE__SUCCESS ||
  type === ActionTypes.CARD_UPDATE__FAILURE ||
  type === ActionTypes.CARD_DELETE__SUCCESS ||
  type === ActionTypes.CARD_DELETE__FAILURE;

const isCardOperationHandle = (type) =>
  type === ActionTypes.CARD_UPDATE_HANDLE || type === ActionTypes.CARD_DELETE_HANDLE;

export default (state, action) => {
  const operations = state?.[OPERATIONS_KEY] || {};
  const cardId = getCardId(action);
  const { operationId, rollbackData } = action.payload || {};
  const cardOperations = cardId ? operations[cardId] || [] : [];
  const operationIndex = cardOperations.findIndex(({ id }) => id === operationId);

  if (cardId && operationId && isCardOperationResult(action.type) && operationIndex === -1) {
    return state;
  }

  if (
    operationId &&
    isCardOperationResult(action.type) &&
    operationIndex < cardOperations.length - 1
  ) {
    const nextCardOperations = cardOperations.filter(({ id }) => id !== operationId);

    if (action.type.endsWith('__FAILURE')) {
      nextCardOperations[operationIndex] = {
        ...nextCardOperations[operationIndex],
        rollbackData: cardOperations[operationIndex].rollbackData,
      };
    }

    return {
      ...state,
      [OPERATIONS_KEY]: {
        ...operations,
        [cardId]: nextCardOperations,
      },
    };
  }

  const operation = cardOperations[operationIndex];
  const nextAction =
    operation && action.type.endsWith('__FAILURE')
      ? {
          ...action,
          payload: {
            ...action.payload,
            rollbackData: operation.rollbackData,
          },
        }
      : action;
  const nextState = baseReducer(state, nextAction);

  if (cardId && operationId && isCardOperationStart(action.type)) {
    return {
      ...nextState,
      [OPERATIONS_KEY]: {
        ...operations,
        [cardId]: [
          ...cardOperations,
          {
            id: operationId,
            rollbackData,
          },
        ],
      },
    };
  }

  if (
    cardId &&
    (isCardOperationResult(action.type) || isCardOperationHandle(action.type)) &&
    cardOperations.length > 0
  ) {
    const nextOperations = { ...operations };

    if (action.type.endsWith('__FAILURE') && cardOperations.length > 1) {
      nextOperations[cardId] = cardOperations.slice(0, -1);
    } else {
      delete nextOperations[cardId];
    }

    return {
      ...nextState,
      [OPERATIONS_KEY]: nextOperations,
    };
  }

  return nextState;
};
