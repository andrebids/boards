/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, delay, put, select } from 'redux-saga/effects';
import { nanoid } from 'nanoid';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* fetchChatMembers(projectId) {
  yield put(actions.fetchChatMembers(projectId));

  let users;
  try {
    ({ items: users } = yield call(request, api.getChatMembers, projectId));
  } catch (error) {
    yield put(actions.fetchChatMembers.failure(projectId, error));
    return;
  }

  yield put(actions.fetchChatMembers.success(projectId, users));
}

export function* fetchChatConversations(projectId) {
  yield put(actions.fetchChatConversations(projectId));

  let conversations;
  let chatParticipants = [];
  let users = [];
  try {
    const body = yield call(request, api.getChatConversations, projectId);
    conversations = body.items;
    chatParticipants = body.included?.chatParticipants || [];
    users = body.included?.users || [];
  } catch (error) {
    yield put(actions.fetchChatConversations.failure(projectId, error));
    return;
  }

  yield put(
    actions.fetchChatConversations.success(projectId, conversations, chatParticipants, users),
  );
}

export function* fetchChatForProject(projectId) {
  if (!projectId) {
    return;
  }

  yield all([call(fetchChatMembers, projectId), call(fetchChatConversations, projectId)]);
}

export function* fetchChatForCurrentProject() {
  const { projectId } = yield select(selectors.selectPath);
  yield call(fetchChatForProject, projectId);
}

function* createChatConversation(projectId, type, userId) {
  const requestKey =
    type === 'projectGroup' ? `${projectId}:general` : `${projectId}:direct:${userId}`;
  yield put(actions.createChatConversation(projectId, type, requestKey));

  let conversation;
  let chatParticipants = [];
  let users = [];
  try {
    const body =
      type === 'projectGroup'
        ? yield call(request, api.createGeneralChatConversation, projectId)
        : yield call(request, api.createDirectChatConversation, projectId, { userId });

    conversation = body.item;
    chatParticipants = body.included?.chatParticipants || [];
    users = body.included?.users || [];
  } catch (error) {
    yield put(actions.createChatConversation.failure(projectId, type, requestKey, error));
    return;
  }

  yield put(actions.createChatConversation.success(conversation, chatParticipants, users));
}

export function* createGeneralChatConversation(projectId) {
  yield call(createChatConversation, projectId, 'projectGroup');
}

export function* createDirectChatConversation(projectId, userId) {
  yield call(createChatConversation, projectId, 'projectDirect', userId);
}

export function* createCustomChatGroup(projectId, data) {
  const requestKey = `${projectId}:group`;
  yield put(actions.createChatConversation(projectId, 'projectCustomGroup', requestKey));
  try {
    const body = yield call(request, api.createCustomChatGroup, projectId, data);
    yield put(
      actions.createChatConversation.success(
        body.item,
        body.included?.chatParticipants || [],
        body.included?.users || [],
      ),
    );
  } catch (error) {
    yield put(
      actions.createChatConversation.failure(projectId, 'projectCustomGroup', requestKey, error),
    );
  }
}

export function* updateChatConversation(id, data) {
  try {
    const { item } = yield call(request, api.updateChatConversation, id, data);
    yield put(actions.handleChatConversationUpdate(item, [], []));
  } catch {
    // The server remains the source of truth for the title.
  }
}

export function* addChatConversationParticipants(id, userIds) {
  try {
    const body = yield call(request, api.addChatConversationParticipants, id, userIds);
    yield put(
      actions.handleChatConversationUpdate(
        body.item,
        body.included?.chatParticipants || [],
        body.included?.users || [],
      ),
    );
  } catch {
    // Membership changes are reflected only after server confirmation.
  }
}

export function* deleteChatConversationParticipant(id, userId) {
  try {
    yield call(request, api.deleteChatConversationParticipant, id, userId);
  } catch {
    // Server events keep authorized participants in sync.
  }
}

export function* leaveChatConversation(id) {
  const conversation = yield select(selectors.selectChatConversationById, id);
  try {
    yield call(request, api.leaveChatConversation, id);
    if (conversation) {
      yield put(actions.handleChatConversationAccessRevoke(conversation.projectId, id));
    }
  } catch {
    // Keep the conversation visible when leaving failed.
  }
}

export function* handleChatConversationCreate(conversation, chatParticipants, users) {
  yield put(actions.handleChatConversationCreate(conversation, chatParticipants, users));
}

export function* handleChatConversationUpdate(conversation, chatParticipants, users) {
  yield put(actions.handleChatConversationUpdate(conversation, chatParticipants, users));
}

export function* fetchChatMessages(conversationId, options = {}) {
  const { replace = false, ...requestOptions } = options;
  let direction = 'before';
  if (requestOptions.aroundId) {
    direction = 'around';
  } else if (requestOptions.afterId) {
    direction = 'after';
  }
  const loadedMessages = yield select(selectors.selectChatMessagesByConversationId, conversationId);
  const firstPersistedMessage = replace
    ? undefined
    : loadedMessages.find((message) => message.isPersisted);

  yield put(actions.fetchChatMessages(conversationId));

  let messages;
  let users = [];
  let hasMore;
  let hasMoreAfter;
  try {
    let parameters = { beforeId: firstPersistedMessage?.id };
    if (requestOptions.aroundId) {
      parameters = { aroundId: requestOptions.aroundId };
    } else if (requestOptions.afterId) {
      parameters = { afterId: requestOptions.afterId };
    }
    const body = yield call(request, api.getChatMessages, conversationId, parameters);
    messages = body.items;
    users = body.included?.users || [];
    hasMore = body.hasMore ?? body.meta?.hasMore ?? messages.length > 0;
    hasMoreAfter = body.meta?.hasMoreAfter ?? (direction === 'after' ? hasMore : false);
  } catch (error) {
    yield put(actions.fetchChatMessages.failure(conversationId, error));
    return;
  }

  yield put(
    actions.fetchChatMessages.success(
      conversationId,
      messages,
      users,
      hasMore,
      replace,
      hasMoreAfter,
      direction,
    ),
  );
}

function* uploadChatMessageAttachments(message, files) {
  let updatedMessage = message;
  const failedFiles = [];
  let lastError;

  for (let index = 0; index < files.length; index += 1) {
    try {
      ({ item: updatedMessage } = yield call(request, api.createChatMessageAttachment, message.id, {
        file: files[index],
      }));
    } catch (error) {
      failedFiles.push(files[index]);
      lastError = error;
    }
  }

  return { failedFiles, lastError, message: updatedMessage };
}

function* sendChatMessage(localId, conversationId, data, existingMessageId) {
  const { files = [], clientMessageId = localId, ...messageData } = data;
  let message;
  if (existingMessageId) {
    message = yield select(selectors.selectChatMessageById, existingMessageId);
  } else {
    try {
      ({ item: message } = yield call(request, api.createChatMessage, conversationId, {
        ...messageData,
        clientMessageId,
        hasAttachments: files.length > 0,
      }));
    } catch (error) {
      yield put(actions.createChatMessage.failure(localId, error));
      return;
    }
  }

  const uploadResult = yield call(uploadChatMessageAttachments, message, files);

  yield put(
    actions.createChatMessage.success(localId, {
      ...uploadResult.message,
      clientMessageId,
      pendingFiles: uploadResult.failedFiles,
      isPending: false,
      isFailed: uploadResult.failedFiles.length > 0,
      error: uploadResult.lastError,
    }),
  );
}

export function* createChatMessage(conversationId, data) {
  const localId = yield call(createLocalId);
  const clientMessageId = yield call(nanoid);
  const currentUserId = yield select(selectors.selectCurrentUserId);
  const { files = [], ...messageData } = data;

  yield put(
    actions.createChatMessage({
      ...messageData,
      id: localId,
      localId,
      clientMessageId,
      conversationId,
      userId: currentUserId,
      createdAt: new Date(),
      isPending: true,
      isFailed: false,
      pendingFiles: files,
    }),
  );

  yield call(sendChatMessage, localId, conversationId, {
    ...messageData,
    clientMessageId,
    files,
  });
}

export function* retryChatMessage(localId) {
  const message = yield select(selectors.selectChatMessageById, localId);
  if (!message || !message.isFailed) {
    return;
  }

  yield put(actions.retryChatMessage(localId));
  yield call(
    sendChatMessage,
    localId,
    message.conversationId,
    {
      text: message.text,
      replyToMessageId: message.replyToMessageId,
      clientMessageId: message.clientMessageId || message.localId || localId,
      files: message.pendingFiles || [],
    },
    message.localId ? undefined : message.id,
  );
}

export function* handleChatMessageCreate(message, users) {
  yield put(actions.handleChatMessageCreate(message, users));
}

export function* updateChatMessage(id, data) {
  const previousMessage = yield select(selectors.selectChatMessageById, id);
  yield put(actions.updateChatMessage(id, data));

  let message;
  try {
    ({ item: message } = yield call(request, api.updateChatMessage, id, data));
  } catch (error) {
    yield put(actions.updateChatMessage.failure(id, previousMessage, error));
    return;
  }

  yield put(actions.updateChatMessage.success(message));
}

export function* handleChatMessageUpdate(message) {
  yield put(actions.handleChatMessageUpdate(message));
}

export function* deleteChatMessage(id) {
  yield put(actions.deleteChatMessage(id));

  let message;
  try {
    ({ item: message } = yield call(request, api.deleteChatMessage, id));
  } catch (error) {
    yield put(actions.deleteChatMessage.failure(id, error));
    return;
  }

  yield put(actions.deleteChatMessage.success(message));
}

export function* handleChatMessageDelete(message) {
  yield put(actions.handleChatMessageDelete(message));
}

export function* toggleChatMessageReaction(id, emoji) {
  let message;
  try {
    ({ item: message } = yield call(request, api.toggleChatMessageReaction, id, emoji));
  } catch (error) {
    return;
  }

  yield put(actions.handleChatMessageUpdate(message));
}

export function* fetchChatSavedMessages(projectId) {
  yield put(actions.fetchChatSavedMessages(projectId));
  try {
    const body = yield call(request, api.getChatSavedMessages, projectId, {});
    yield put(
      actions.fetchChatSavedMessages.success(
        projectId,
        body.items,
        body.included?.users || [],
        body.meta?.hasMore || false,
      ),
    );
  } catch (error) {
    yield put(actions.fetchChatSavedMessages.failure(projectId, error));
  }
}

export function* toggleChatMessageSaved(id, isSaved) {
  yield put(actions.toggleChatMessageSaved(id, isSaved));
  try {
    const { item } = yield call(
      request,
      isSaved ? api.createChatSavedMessage : api.deleteChatSavedMessage,
      id,
    );
    yield put(actions.toggleChatMessageSaved.success(item));
  } catch (error) {
    yield put(actions.toggleChatMessageSaved.failure(id, !isSaved, error));
  }
}

export function* forwardChatMessage(id, targetConversationId) {
  try {
    const clientMessageId = yield call(nanoid);
    const { item } = yield call(request, api.forwardChatMessage, id, {
      targetConversationId,
      clientMessageId,
    });
    yield put(actions.handleChatMessageCreate(item, []));
  } catch {
    // The source remains unchanged and can be forwarded again.
  }
}

export function* updateChatConversationPreferences(id, data) {
  const conversation = yield select(selectors.selectChatConversationById, id);
  const currentUserId = yield select(selectors.selectCurrentUserId);
  const participant = conversation?.participants?.find(({ userId }) => userId === currentUserId);
  const previousData = participant && {
    notificationLevel: participant.notificationLevel,
    mutedUntil: participant.mutedUntil,
  };
  yield put(actions.updateChatConversationPreferences(id, data));
  try {
    const { item } = yield call(request, api.updateChatConversationPreferences, id, data);
    yield put(actions.updateChatConversationPreferences.success(item));
  } catch (error) {
    yield put(actions.updateChatConversationPreferences.failure(id, previousData, error));
  }
}

export function* updateChatTyping(id, isTyping) {
  try {
    yield call(request, api.updateChatTyping, id, isTyping);
  } catch {
    // Typing state is ephemeral and expires on every client.
  }
}

export function* handleChatParticipantUpdate(participant) {
  yield put(actions.handleChatParticipantUpdate(participant));
}

export function* handleChatTypingUpdate(typingState) {
  const receivedAt = Date.now();
  yield put(actions.handleChatTypingUpdate({ ...typingState, receivedAt }));
  if (typingState.isTyping) {
    yield delay(5500);
    yield put(
      actions.handleChatTypingUpdate({
        ...typingState,
        isTyping: false,
        receivedAt,
      }),
    );
  }
}

export function* handleChatConversationAccessRevoke(projectId, conversationId) {
  yield put(actions.handleChatConversationAccessRevoke(projectId, conversationId));
}

export function* updateChatDraft(conversationId, text) {
  yield put(actions.updateChatDraft(conversationId, text));
}

export function* setChatReplyTarget(conversationId, message) {
  yield put(actions.setChatReplyTarget(conversationId, message));
}

export function* markChatConversationAsRead(conversationId) {
  const conversation = yield select(selectors.selectChatConversationById, conversationId);
  const previousUnreadCount = conversation?.unreadCount || 0;
  yield put(actions.markChatConversationAsRead(conversationId));

  let readState;
  try {
    ({ item: readState } = yield call(request, api.markChatConversationAsRead, conversationId, {}));
  } catch (error) {
    yield put(
      actions.markChatConversationAsRead.failure(conversationId, previousUnreadCount, error),
    );
    return;
  }

  yield put(actions.markChatConversationAsRead.success(readState));
}

export function* handleChatConversationRead(readState) {
  yield put(actions.handleChatConversationRead(readState));
}

export function* handleChatProjectAccessRevoke(projectId) {
  const conversationIds = yield select(selectors.selectChatConversationIdsByProjectId, projectId);
  yield put(actions.handleChatProjectAccessRevoke(projectId, conversationIds));
}

export function* openChatConversation(id) {
  yield put(actions.openChatConversation(id));

  try {
    yield call(request, api.subscribeToChatConversation, id);
  } catch {
    // Fetching the messages also retries the subscription.
  }
}

export function* closeChatConversation(id) {
  yield put(actions.closeChatConversation(id));

  try {
    yield call(request, api.unsubscribeFromChatConversation, id);
  } catch {
    // The server drops socket rooms on disconnect; no local state must remain open.
  }
}

export function* toggleChatConversationMinimized(id) {
  yield put(actions.toggleChatConversationMinimized(id));
}

export default {
  fetchChatMembers,
  fetchChatConversations,
  fetchChatForProject,
  fetchChatForCurrentProject,
  createGeneralChatConversation,
  createDirectChatConversation,
  createCustomChatGroup,
  updateChatConversation,
  addChatConversationParticipants,
  deleteChatConversationParticipant,
  leaveChatConversation,
  handleChatConversationCreate,
  handleChatConversationUpdate,
  fetchChatMessages,
  createChatMessage,
  retryChatMessage,
  handleChatMessageCreate,
  updateChatMessage,
  handleChatMessageUpdate,
  deleteChatMessage,
  handleChatMessageDelete,
  toggleChatMessageReaction,
  fetchChatSavedMessages,
  toggleChatMessageSaved,
  forwardChatMessage,
  updateChatConversationPreferences,
  updateChatTyping,
  handleChatParticipantUpdate,
  handleChatTypingUpdate,
  handleChatConversationAccessRevoke,
  updateChatDraft,
  setChatReplyTarget,
  markChatConversationAsRead,
  handleChatConversationRead,
  handleChatProjectAccessRevoke,
  openChatConversation,
  closeChatConversation,
  toggleChatConversationMinimized,
};
