/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';

export function* fetchChatInbox(options) {
  let effectiveOptions = options;
  if (!effectiveOptions) {
    const chatState = yield select(selectors.selectChatState);
    effectiveOptions = chatState.inboxRequest || {};
  }

  const requestOptions = {
    filter: effectiveOptions.filter || 'all',
    limit: effectiveOptions.limit || 50,
    ...(effectiveOptions.query && { query: effectiveOptions.query }),
    ...(effectiveOptions.before && { before: effectiveOptions.before }),
  };
  const actionOptions = {
    ...requestOptions,
    append: Boolean(effectiveOptions.append && effectiveOptions.before),
  };
  yield put(actions.fetchChatInbox(actionOptions));

  try {
    const body = yield call(request, api.getChatInbox, requestOptions);
    yield put(
      actions.fetchChatInbox.success(
        body.items || [],
        body.meta || {},
        body.included?.users || [],
        actionOptions,
        body.people || [],
      ),
    );
  } catch (error) {
    yield put(actions.fetchChatInbox.failure(error, actionOptions));
  }
}

export function* markAllChatInboxAsRead(conversationIds) {
  const chatState = yield select(selectors.selectChatState);
  const targetConversationIds = (
    conversationIds ||
    Object.values(chatState.inboxItemsByConversationId)
      .filter((item) => (item.unreadCount || 0) > 0)
      .map((item) => item.conversationId)
  ).filter(Boolean);

  if (targetConversationIds.length === 0) {
    return;
  }

  const previousItemsByConversationId = targetConversationIds.reduce(
    (result, conversationId) => ({
      ...result,
      ...(chatState.inboxItemsByConversationId[conversationId] && {
        [conversationId]: chatState.inboxItemsByConversationId[conversationId],
      }),
    }),
    {},
  );
  const previousMeta = chatState.inboxMeta;
  yield put(
    actions.markAllChatInboxAsRead(
      targetConversationIds,
      previousItemsByConversationId,
      previousMeta,
    ),
  );

  try {
    const body = yield call(
      request,
      api.markAllChatInboxAsRead,
      conversationIds ? targetConversationIds : undefined,
    );
    yield put(actions.markAllChatInboxAsRead.success(body.items || [], body.meta));
    yield all(
      (body.items || []).map((readState) => put(actions.handleChatConversationRead(readState))),
    );
  } catch (error) {
    yield put(
      actions.markAllChatInboxAsRead.failure(previousItemsByConversationId, previousMeta, error),
    );
  }
}

export function* markChatConversationAsRead(conversationId, messageId) {
  const conversation = yield select(selectors.selectChatConversationById, conversationId);
  const chatState = yield select(selectors.selectChatState);
  const inboxItem = chatState.inboxItemsByConversationId[conversationId];
  if (!conversation && !inboxItem) {
    return;
  }
  const previousUnreadCount = conversation
    ? conversation.unreadCount || 0
    : inboxItem?.unreadCount || 0;
  if (!messageId) {
    yield put(actions.markChatConversationAsRead(conversationId, inboxItem));
  }

  let readState;
  try {
    ({ item: readState } = yield call(request, api.markChatConversationAsRead, conversationId, {
      ...(messageId && { messageId }),
    }));
  } catch (error) {
    const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
    const currentChatState = yield select(selectors.selectChatState);
    if (
      !messageId &&
      (currentConversation || currentChatState.inboxItemsByConversationId[conversationId])
    ) {
      yield put(
        actions.markChatConversationAsRead.failure(
          conversationId,
          previousUnreadCount,
          error,
          inboxItem,
        ),
      );
    }
    return;
  }

  const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
  const currentChatState = yield select(selectors.selectChatState);
  if (currentConversation || currentChatState.inboxItemsByConversationId[conversationId]) {
    yield put(actions.markChatConversationAsRead.success(readState));
  }
}

export function* handleChatConversationRead(readState) {
  yield put(actions.handleChatConversationRead(readState));
}

export default {
  fetchChatInbox,
  handleChatConversationRead,
  markAllChatInboxAsRead,
  markChatConversationAsRead,
};
