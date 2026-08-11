/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const fetchCards = listId => ({
  type: ActionTypes.CARDS_FETCH,
  payload: {
    listId,
  },
});

fetchCards.success = (
  listId,
  cards,
  users,
  cardMemberships,
  cardLabels,
  taskLists,
  tasks,
  attachments,
  customFieldGroups,
  customFields,
  customFieldValues
) => ({
  type: ActionTypes.CARDS_FETCH__SUCCESS,
  payload: {
    listId,
    cards,
    users,
    cardMemberships,
    cardLabels,
    taskLists,
    tasks,
    attachments,
    customFieldGroups,
    customFields,
    customFieldValues,
  },
});

fetchCards.failure = (listId, error) => ({
  type: ActionTypes.CARDS_FETCH__FAILURE,
  payload: {
    listId,
    error,
  },
});

const handleCardsUpdate = (cards, activities) => ({
  type: ActionTypes.CARDS_UPDATE_HANDLE,
  payload: {
    cards,
    activities,
  },
});

const createCard = (card, autoOpen) => ({
  type: ActionTypes.CARD_CREATE,
  payload: {
    card,
    autoOpen,
  },
});

createCard.success = (localId, card) => ({
  type: ActionTypes.CARD_CREATE__SUCCESS,
  payload: {
    localId,
    card,
  },
});

createCard.failure = (localId, error) => ({
  type: ActionTypes.CARD_CREATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const handleCardCreate = (
  card,
  users,
  cardMemberships,
  cardLabels,
  taskLists,
  tasks,
  attachments,
  customFieldGroups,
  customFields,
  customFieldValues
) => ({
  type: ActionTypes.CARD_CREATE_HANDLE,
  payload: {
    card,
    users,
    cardMemberships,
    cardLabels,
    taskLists,
    tasks,
    attachments,
    customFieldGroups,
    customFields,
    customFieldValues,
  },
});

const updateCard = (id, data, operationId, rollbackData) => ({
  type: ActionTypes.CARD_UPDATE,
  payload: {
    id,
    data,
    operationId,
    rollbackData,
  },
});

updateCard.success = (card, operationId) => ({
  type: ActionTypes.CARD_UPDATE__SUCCESS,
  payload: {
    card,
    operationId,
  },
});

updateCard.failure = (id, error, rollbackData, operationId) => ({
  type: ActionTypes.CARD_UPDATE__FAILURE,
  payload: {
    id,
    error,
    rollbackData,
    operationId,
  },
});

const handleCardUpdate = (
  card,
  isFetched,
  users,
  cardMemberships,
  cardLabels,
  taskLists,
  tasks,
  attachments,
  customFieldGroups,
  customFields,
  customFieldValues
) => ({
  type: ActionTypes.CARD_UPDATE_HANDLE,
  payload: {
    card,
    isFetched,
    users,
    cardMemberships,
    cardLabels,
    taskLists,
    tasks,
    attachments,
    customFieldGroups,
    customFields,
    customFieldValues,
  },
});

const duplicateCard = (id, localId, data) => ({
  type: ActionTypes.CARD_DUPLICATE,
  payload: {
    id,
    localId,
    data,
  },
});

duplicateCard.success = (
  localId,
  card,
  cardMemberships,
  cardLabels,
  taskLists,
  tasks,
  attachments,
  customFieldGroups,
  customFields,
  customFieldValues
) => ({
  type: ActionTypes.CARD_DUPLICATE__SUCCESS,
  payload: {
    localId,
    card,
    cardMemberships,
    cardLabels,
    taskLists,
    tasks,
    attachments,
    customFieldGroups,
    customFields,
    customFieldValues,
  },
});

duplicateCard.failure = (localId, error) => ({
  type: ActionTypes.CARD_DUPLICATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const deleteCard = (id, operationId, rollbackData) => ({
  type: ActionTypes.CARD_DELETE,
  payload: {
    id,
    operationId,
    rollbackData,
  },
});

deleteCard.success = (card, operationId) => ({
  type: ActionTypes.CARD_DELETE__SUCCESS,
  payload: {
    card,
    operationId,
  },
});

deleteCard.failure = (id, error, rollbackData, operationId) => ({
  type: ActionTypes.CARD_DELETE__FAILURE,
  payload: {
    id,
    error,
    rollbackData,
    operationId,
  },
});

const handleCardDelete = card => ({
  type: ActionTypes.CARD_DELETE_HANDLE,
  payload: {
    card,
  },
});

export default {
  fetchCards,
  handleCardsUpdate,
  createCard,
  handleCardCreate,
  updateCard,
  handleCardUpdate,
  duplicateCard,
  deleteCard,
  handleCardDelete,
};
