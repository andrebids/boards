/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, put, select } from 'redux-saga/effects';

import request from '../request';
import requests from '../requests';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { fetchChatForProject, fetchChatMessages } from './chat';

export function* handleSocketDisconnect() {
  yield put(actions.handleSocketDisconnect());
}

export function* handleSocketReconnect() {
  const { boardId, projectId } = yield select(selectors.selectPath);
  const currentUserId = yield select(selectors.selectCurrentUserId);
  const openChatConversationIds = yield select(selectors.selectOpenChatConversationIds);

  yield put(actions.handleSocketReconnect.fetchCore(currentUserId, boardId));

  let config;
  let user;
  let board;
  let users;
  let projects;
  let projectManagers;
  let backgroundImages;
  let baseCustomFieldGroups;
  let boards;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;
  let notifications;
  let notificationServices;

  try {
    ({ item: config } = yield call(request, api.getConfig));

    ({
      user,
      board,
      users,
      projects,
      projectManagers,
      backgroundImages,
      baseCustomFieldGroups,
      boards,
      boardMemberships,
      labels,
      lists,
      cards,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
      notifications,
      notificationServices,
    } = yield call(requests.fetchCore));
  } catch {
    return;
  }

  yield put(
    actions.handleSocketReconnect(
      config,
      user,
      board,
      users,
      projects,
      projectManagers,
      backgroundImages,
      baseCustomFieldGroups,
      boards,
      boardMemberships,
      labels,
      lists,
      cards,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
      notifications,
      notificationServices,
    ),
  );

  if (projectId) {
    yield call(fetchChatForProject, projectId);
    yield all(
      openChatConversationIds.map((conversationId) =>
        call(fetchChatMessages, conversationId, { replace: true }),
      ),
    );
  }

  const isAvailableForCurrentUser = yield select(selectors.isCurrentModalAvailableForCurrentUser);

  if (!isAvailableForCurrentUser) {
    yield put(actions.closeModal());
  }
}

export default {
  handleSocketDisconnect,
  handleSocketReconnect,
};
