/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, delay, put, race, select } from 'redux-saga/effects';
import { nanoid } from 'nanoid';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import { reportChatError } from '../../../sentry';

const getFileSizeBucket = (file) => {
  if (!file?.size) return 'none';
  if (file.size < 1024 * 1024) return 'under-1mb';
  if (file.size < 5 * 1024 * 1024) return '1mb-5mb';
  if (file.size < 25 * 1024 * 1024) return '5mb-25mb';
  return 'over-25mb';
};

const getMimeGroup = (file) => {
  const group = file?.type?.split('/')[0];
  return ['image', 'video', 'audio', 'text', 'application'].includes(group) ? group : 'other';
};

const getErrorCode = (error) =>
  String(error?.code || error?.name || 'UNKNOWN_ERROR')
    .replace(/[^a-zA-Z0-9_.:-]/g, '_')
    .slice(0, 128);

const getStatusCode = (error) => {
  const statusCode = Number(error?.statusCode || error?.status);
  return Number.isInteger(statusCode) && statusCode >= 0 && statusCode <= 599
    ? statusCode
    : undefined;
};

function* reportChatDeliveryFailure(error, details) {
  const accessToken = yield select(selectors.selectAccessToken);
  const diagnostic = Object.fromEntries(
    Object.entries({
      ...details,
      errorCode: getErrorCode(error),
      statusCode: getStatusCode(error),
      online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
    }).filter(([, value]) => value !== undefined),
  );

  console.warn('[CHAT_DELIVERY][FAILED]', diagnostic); // eslint-disable-line no-console
  reportChatError(error, details.event, {
    tags: {
      transport: diagnostic.transport,
      errorCode: diagnostic.errorCode,
    },
    details: diagnostic,
  });

  try {
    yield race({
      request: call(api.createChatDiagnostic, diagnostic, {
        Authorization: `Bearer ${accessToken}`,
      }),
      timeout: delay(5000),
    });
  } catch {
    // The browser console and Sentry remain available if the diagnostic request also fails.
  }
}

export function* fetchChatMembers(projectId) {
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  const accessRevocationVersion = accessRevocationVersions[projectId] || 0;
  yield put(actions.fetchChatMembers(projectId));

  let users;
  try {
    ({ items: users } = yield call(request, api.getChatMembers, projectId));
  } catch (error) {
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
      return;
    }
    yield put(actions.fetchChatMembers.failure(projectId, error));
    return;
  }

  const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
    return;
  }
  yield put(actions.fetchChatMembers.success(projectId, users));
}

export function* fetchChatInbox() {
  yield put(actions.fetchChatInbox());

  try {
    const body = yield call(request, api.getChatInbox);
    yield put(
      actions.fetchChatInbox.success(body.items || [], body.meta || {}, body.included?.users || []),
    );
  } catch (error) {
    yield put(actions.fetchChatInbox.failure(error));
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
    const body = yield call(request, api.markAllChatInboxAsRead, targetConversationIds);
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

export function* fetchChatConversations(projectId) {
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  const accessRevocationVersion = accessRevocationVersions[projectId] || 0;
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
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
      return;
    }
    yield put(actions.fetchChatConversations.failure(projectId, error));
    return;
  }

  const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
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
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  const accessRevocationVersion = accessRevocationVersions[projectId] || 0;
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
        : yield call(request, api.createDirectChatConversation, projectId, {
            userId,
          });

    conversation = body.item;
    chatParticipants = body.included?.chatParticipants || [];
    users = body.included?.users || [];
  } catch (error) {
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
      return;
    }
    yield put(actions.createChatConversation.failure(projectId, type, requestKey, error));
    return;
  }

  const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
    return;
  }
  yield put(actions.handleChatInboxItemUpdate(conversation));
  yield put(actions.createChatConversation.success(conversation, chatParticipants, users));
}

export function* createGeneralChatConversation(projectId) {
  yield call(createChatConversation, projectId, 'projectGroup');
}

export function* createDirectChatConversation(projectId, userId) {
  yield call(createChatConversation, projectId, 'projectDirect', userId);
}

export function* createCustomChatGroup(projectId, data, requestKey = `${projectId}:group`) {
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  const accessRevocationVersion = accessRevocationVersions[projectId] || 0;
  yield put(actions.createChatConversation(projectId, 'projectCustomGroup', requestKey));
  try {
    const body = yield call(request, api.createCustomChatGroup, projectId, data);
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
      return;
    }
    yield put(actions.handleChatInboxItemUpdate(body.item));
    yield put(
      actions.createChatConversation.success(
        body.item,
        body.included?.chatParticipants || [],
        body.included?.users || [],
        requestKey,
      ),
    );
  } catch (error) {
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if ((currentVersions[projectId] || 0) !== accessRevocationVersion) {
      return;
    }
    yield put(
      actions.createChatConversation.failure(projectId, 'projectCustomGroup', requestKey, error),
    );
  }
}

export function* updateChatConversation(id, data) {
  try {
    const { item } = yield call(request, api.updateChatConversation, id, data);
    yield put(actions.handleChatInboxItemUpdate(item));
    const conversation = yield select(selectors.selectChatConversationById, item.id);
    if (conversation) {
      yield put(actions.handleChatConversationUpdate(item, [], []));
    }
  } catch (error) {
    reportChatError(error, 'update-conversation');
    // The server remains the source of truth for the title.
  }
}

export function* addChatConversationParticipants(id, userIds) {
  try {
    const body = yield call(request, api.addChatConversationParticipants, id, userIds);
    yield put(actions.handleChatInboxItemUpdate(body.item));
    const conversation = yield select(selectors.selectChatConversationById, body.item.id);
    if (conversation) {
      yield put(
        actions.handleChatConversationUpdate(
          body.item,
          body.included?.chatParticipants || [],
          body.included?.users || [],
        ),
      );
    }
  } catch (error) {
    reportChatError(error, 'add-participants');
    // Membership changes are reflected only after server confirmation.
  }
}

export function* deleteChatConversationParticipant(id, userId) {
  try {
    yield call(request, api.deleteChatConversationParticipant, id, userId);
  } catch (error) {
    reportChatError(error, 'remove-participant');
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
  } catch (error) {
    reportChatError(error, 'leave-conversation');
    // Keep the conversation visible when leaving failed.
  }
}

export function* handleChatConversationCreate(conversation, chatParticipants, users) {
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if ((accessRevocationVersions[conversation.projectId] || 0) > 0) {
    const chatState = yield select(selectors.selectChatState);
    const currentUserId = yield select(selectors.selectCurrentUserId);
    if (!(chatState.memberIdsByProject[conversation.projectId] || []).includes(currentUserId)) {
      return;
    }
  }
  yield put(actions.handleChatInboxItemUpdate(conversation));
  yield put(actions.handleChatConversationCreate(conversation, chatParticipants, users));
}

export function* handleChatConversationUpdate(conversation, chatParticipants, users) {
  yield put(actions.handleChatInboxItemUpdate(conversation));
  const currentConversation = yield select(selectors.selectChatConversationById, conversation.id);
  if (!currentConversation) {
    return;
  }
  yield put(actions.handleChatConversationUpdate(conversation, chatParticipants, users));
}

export function* fetchChatMessages(conversationId, options = {}) {
  const conversation = yield select(selectors.selectChatConversationById, conversationId);
  if (!conversation) {
    return;
  }
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  const accessRevocationVersion = accessRevocationVersions[conversation.projectId] || 0;
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
    const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
    const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
    if (
      !currentConversation ||
      (currentVersions[conversation.projectId] || 0) !== accessRevocationVersion
    ) {
      return;
    }
    yield put(actions.fetchChatMessages.failure(conversationId, error));
    return;
  }

  const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
  const currentVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if (
    !currentConversation ||
    (currentVersions[conversation.projectId] || 0) !== accessRevocationVersion
  ) {
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
    const startedAt = Date.now();
    try {
      ({ item: updatedMessage } = yield call(request, api.createChatMessageAttachment, message.id, {
        file: files[index],
      }));
    } catch (error) {
      failedFiles.push(files[index]);
      lastError = error;
      yield call(reportChatDeliveryFailure, error, {
        event: 'attachment-upload-failed',
        transport: 'http',
        clientMessageId: message.clientMessageId,
        messageId: message.id,
        durationMs: Math.min(Date.now() - startedAt, 10 * 60 * 1000),
        hasAttachments: true,
        fileCount: files.length,
        fileSizeBucket: getFileSizeBucket(files[index]),
        mimeGroup: getMimeGroup(files[index]),
        attempt: index + 1,
      });
    }
  }

  return { failedFiles, lastError, message: updatedMessage };
}

function* sendChatMessage(localId, conversationId, data, existingMessageId) {
  const { files = [], clientMessageId = localId, ...messageData } = data;
  const startedAt = Date.now();
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
      yield call(reportChatDeliveryFailure, error, {
        event: 'message-create-failed',
        transport: 'socket',
        clientMessageId,
        durationMs: Math.min(Date.now() - startedAt, 10 * 60 * 1000),
        hasAttachments: files.length > 0,
        fileCount: files.length,
        fileSizeBucket: files.length > 0 ? getFileSizeBucket(files[0]) : 'none',
        mimeGroup: files.length > 0 ? getMimeGroup(files[0]) : 'none',
      });
      yield put(actions.createChatMessage.failure(localId, error));
      return;
    }
  }

  const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
  if (!currentConversation) {
    return;
  }

  const uploadResult = yield call(uploadChatMessageAttachments, message, files);

  const conversationAfterUploads = yield select(
    selectors.selectChatConversationById,
    conversationId,
  );
  if (!conversationAfterUploads) {
    return;
  }

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
  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (!conversation) {
    return;
  }
  yield put(actions.handleChatMessageCreate(message, users));
}

export function* updateChatMessage(id, data) {
  const previousMessage = yield select(selectors.selectChatMessageById, id);
  yield put(actions.updateChatMessage(id, data));

  let message;
  try {
    ({ item: message } = yield call(request, api.updateChatMessage, id, data));
  } catch (error) {
    reportChatError(error, 'update-message');
    yield put(actions.updateChatMessage.failure(id, previousMessage, error));
    return;
  }

  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (conversation) {
    yield put(actions.updateChatMessage.success(message));
  }
}

export function* handleChatMessageUpdate(message) {
  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (conversation) {
    yield put(actions.handleChatMessageUpdate(message));
  }
}

export function* deleteChatMessage(id) {
  yield put(actions.deleteChatMessage(id));

  let message;
  try {
    ({ item: message } = yield call(request, api.deleteChatMessage, id));
  } catch (error) {
    reportChatError(error, 'delete-message');
    yield put(actions.deleteChatMessage.failure(id, error));
    return;
  }

  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (conversation) {
    yield put(actions.deleteChatMessage.success(message));
  }
}

export function* handleChatMessageDelete(message) {
  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (conversation) {
    yield put(actions.handleChatMessageDelete(message));
  }
}

export function* toggleChatMessageReaction(id, emoji) {
  let message;
  try {
    ({ item: message } = yield call(request, api.toggleChatMessageReaction, id, emoji));
  } catch (error) {
    reportChatError(error, 'toggle-reaction');
    return;
  }

  const conversation = yield select(selectors.selectChatConversationById, message.conversationId);
  if (conversation) {
    yield put(actions.handleChatMessageUpdate(message));
  }
}

export function* forwardChatMessage(id, targetConversationId) {
  try {
    const clientMessageId = yield call(nanoid);
    const { item } = yield call(request, api.forwardChatMessage, id, {
      targetConversationId,
      clientMessageId,
    });
    const conversation = yield select(selectors.selectChatConversationById, item.conversationId);
    if (conversation) {
      yield put(actions.handleChatMessageCreate(item, []));
    }
  } catch (error) {
    reportChatError(error, 'forward-message');
    // The source remains unchanged and can be forwarded again.
  }
}

export function* updateChatConversationPreferences(id, data) {
  const conversation = yield select(selectors.selectChatConversationById, id);
  const chatState = yield select(selectors.selectChatState);
  const inboxItem = chatState.inboxItemsByConversationId[id];
  const currentUserId = yield select(selectors.selectCurrentUserId);
  const participant = conversation?.participants?.find(({ userId }) => userId === currentUserId);
  const preferencesSource = participant || inboxItem;
  const previousData = preferencesSource && {
    notificationLevel: preferencesSource.notificationLevel,
    mutedUntil: preferencesSource.mutedUntil,
    isMuted: preferencesSource.isMuted,
  };
  yield put(actions.updateChatConversationPreferences(id, participant?.id, data));
  try {
    const { item } = yield call(request, api.updateChatConversationPreferences, id, data);
    const currentConversation = yield select(selectors.selectChatConversationById, id);
    const currentChatState = yield select(selectors.selectChatState);
    if (currentConversation) {
      yield put(actions.updateChatConversationPreferences.success(item));
    } else if (currentChatState.inboxItemsByConversationId[id]) {
      yield put(
        actions.handleChatInboxItemUpdate(
          {
            conversationId: item.conversationId,
            notificationLevel: item.notificationLevel,
            mutedUntil: item.mutedUntil,
            isMuted: item.isMuted,
          },
          true,
        ),
      );
    }
  } catch (error) {
    const currentConversation = yield select(selectors.selectChatConversationById, id);
    const currentChatState = yield select(selectors.selectChatState);
    if (currentConversation || currentChatState.inboxItemsByConversationId[id]) {
      yield put(
        actions.updateChatConversationPreferences.failure(id, participant?.id, previousData, error),
      );
    }
  }
}

export function* updateChatTyping(id, isTyping) {
  try {
    yield call(request, api.updateChatTyping, id, isTyping);
  } catch (error) {
    reportChatError(error, 'update-typing');
    // Typing state is ephemeral and expires on every client.
  }
}

export function* handleChatParticipantUpdate(participant) {
  yield put(
    actions.handleChatInboxItemUpdate({
      conversationId: participant.conversationId,
      notificationLevel: participant.notificationLevel,
      mutedUntil: participant.mutedUntil,
      isMuted: participant.isMuted,
    }),
  );
  const conversation = yield select(
    selectors.selectChatConversationById,
    participant.conversationId,
  );
  if (conversation) {
    yield put(actions.handleChatParticipantUpdate(participant));
  }
}

export function* handleChatTypingUpdate(typingState) {
  const conversation = yield select(
    selectors.selectChatConversationById,
    typingState.conversationId,
  );
  if (!conversation) {
    return;
  }
  const receivedAt = Date.now();
  yield put(actions.handleChatTypingUpdate({ ...typingState, receivedAt }));
  if (typingState.isTyping) {
    yield delay(5500);
    const currentConversation = yield select(
      selectors.selectChatConversationById,
      typingState.conversationId,
    );
    if (!currentConversation) {
      return;
    }
    yield put(
      actions.handleChatTypingUpdate({
        ...typingState,
        isTyping: false,
        receivedAt,
      }),
    );
  }
}

export function* handleChatMessageAlert(alert) {
  const conversation = yield select(selectors.selectChatConversationById, alert.conversationId);
  const accessRevocationVersions = yield select(selectors.selectChatAccessRevocationVersions);
  if (!conversation && (accessRevocationVersions[alert.projectId] || 0) > 0) {
    return;
  }
  yield put(actions.handleChatMessageAlert(alert));
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
  const chatState = yield select(selectors.selectChatState);
  const inboxItem = chatState.inboxItemsByConversationId[conversationId];
  if (!conversation && !inboxItem) {
    return;
  }
  const previousUnreadCount = conversation
    ? conversation.unreadCount || 0
    : inboxItem?.unreadCount || 0;
  yield put(actions.markChatConversationAsRead(conversationId, inboxItem));

  let readState;
  try {
    ({ item: readState } = yield call(request, api.markChatConversationAsRead, conversationId, {}));
  } catch (error) {
    const currentConversation = yield select(selectors.selectChatConversationById, conversationId);
    const currentChatState = yield select(selectors.selectChatState);
    if (currentConversation || currentChatState.inboxItemsByConversationId[conversationId]) {
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

export function* handleChatProjectAccessRevoke(projectId) {
  const conversationIds = yield select(selectors.selectChatConversationIdsByProjectId, projectId);
  yield put(actions.handleChatProjectAccessRevoke(projectId, conversationIds));
}

export function* openChatConversation(id) {
  yield put(actions.openChatConversation(id));

  try {
    yield call(request, api.subscribeToChatConversation, id);
  } catch (error) {
    reportChatError(error, 'subscribe-conversation');
    // Fetching the messages also retries the subscription.
  }
}

export function* closeChatConversation(id) {
  yield put(actions.closeChatConversation(id));

  try {
    yield call(request, api.unsubscribeFromChatConversation, id);
  } catch (error) {
    reportChatError(error, 'unsubscribe-conversation');
    // The server drops socket rooms on disconnect; no local state must remain open.
  }
}

export function* toggleChatConversationMinimized(id) {
  yield put(actions.toggleChatConversationMinimized(id));
}

export default {
  fetchChatInbox,
  markAllChatInboxAsRead,
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
  forwardChatMessage,
  updateChatConversationPreferences,
  updateChatTyping,
  handleChatParticipantUpdate,
  handleChatTypingUpdate,
  handleChatMessageAlert,
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
