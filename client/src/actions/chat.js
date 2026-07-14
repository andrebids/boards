/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const fetchChatMembers = (projectId) => ({
  type: ActionTypes.CHAT_MEMBERS_FETCH,
  payload: { projectId },
});
fetchChatMembers.success = (projectId, users) => ({
  type: ActionTypes.CHAT_MEMBERS_FETCH__SUCCESS,
  payload: { projectId, users },
});
fetchChatMembers.failure = (projectId, error) => ({
  type: ActionTypes.CHAT_MEMBERS_FETCH__FAILURE,
  payload: { projectId, error },
});

const fetchChatConversations = (projectId) => ({
  type: ActionTypes.CHAT_CONVERSATIONS_FETCH,
  payload: { projectId },
});
fetchChatConversations.success = (projectId, conversations, chatParticipants, users) => ({
  type: ActionTypes.CHAT_CONVERSATIONS_FETCH__SUCCESS,
  payload: { projectId, conversations, chatParticipants, users },
});
fetchChatConversations.failure = (projectId, error) => ({
  type: ActionTypes.CHAT_CONVERSATIONS_FETCH__FAILURE,
  payload: { projectId, error },
});

const createChatConversation = (projectId, type, requestKey) => ({
  type: ActionTypes.CHAT_CONVERSATION_CREATE,
  payload: { projectId, type, requestKey },
});
createChatConversation.success = (conversation, chatParticipants, users, requestKey) => ({
  type: ActionTypes.CHAT_CONVERSATION_CREATE__SUCCESS,
  payload: { conversation, chatParticipants, users, requestKey },
});
createChatConversation.failure = (projectId, type, requestKey, error) => ({
  type: ActionTypes.CHAT_CONVERSATION_CREATE__FAILURE,
  payload: { projectId, type, requestKey, error },
});

const handleChatConversationCreate = (conversation, chatParticipants, users) => ({
  type: ActionTypes.CHAT_CONVERSATION_CREATE_HANDLE,
  payload: { conversation, chatParticipants, users },
});

const handleChatConversationUpdate = (conversation, chatParticipants, users) => ({
  type: ActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE,
  payload: { conversation, chatParticipants, users },
});

const fetchChatMessages = (conversationId) => ({
  type: ActionTypes.CHAT_MESSAGES_FETCH,
  payload: { conversationId },
});
fetchChatMessages.success = (
  conversationId,
  messages,
  users,
  hasMore,
  replace,
  hasMoreAfter,
  direction,
) => ({
  type: ActionTypes.CHAT_MESSAGES_FETCH__SUCCESS,
  payload: { conversationId, messages, users, hasMore, replace, hasMoreAfter, direction },
});
fetchChatMessages.failure = (conversationId, error) => ({
  type: ActionTypes.CHAT_MESSAGES_FETCH__FAILURE,
  payload: { conversationId, error },
});

const createChatMessage = (message) => ({
  type: ActionTypes.CHAT_MESSAGE_CREATE,
  payload: { message },
});
createChatMessage.success = (localId, message) => ({
  type: ActionTypes.CHAT_MESSAGE_CREATE__SUCCESS,
  payload: { localId, message },
});
createChatMessage.failure = (localId, error) => ({
  type: ActionTypes.CHAT_MESSAGE_CREATE__FAILURE,
  payload: { localId, error },
});

const handleChatMessageCreate = (message, users) => ({
  type: ActionTypes.CHAT_MESSAGE_CREATE_HANDLE,
  payload: { message, users },
});

const retryChatMessage = (localId) => ({
  type: ActionTypes.CHAT_MESSAGE_RETRY,
  payload: { localId },
});

const updateChatMessage = (id, data) => ({
  type: ActionTypes.CHAT_MESSAGE_UPDATE,
  payload: { id, data },
});
updateChatMessage.success = (message) => ({
  type: ActionTypes.CHAT_MESSAGE_UPDATE__SUCCESS,
  payload: { message },
});
updateChatMessage.failure = (id, previousData, error) => ({
  type: ActionTypes.CHAT_MESSAGE_UPDATE__FAILURE,
  payload: { id, previousData, error },
});
const handleChatMessageUpdate = (message) => ({
  type: ActionTypes.CHAT_MESSAGE_UPDATE_HANDLE,
  payload: { message },
});

const deleteChatMessage = (id) => ({
  type: ActionTypes.CHAT_MESSAGE_DELETE,
  payload: { id },
});
deleteChatMessage.success = (message) => ({
  type: ActionTypes.CHAT_MESSAGE_DELETE__SUCCESS,
  payload: { message },
});
deleteChatMessage.failure = (id, error) => ({
  type: ActionTypes.CHAT_MESSAGE_DELETE__FAILURE,
  payload: { id, error },
});
const handleChatMessageDelete = (message) => ({
  type: ActionTypes.CHAT_MESSAGE_DELETE_HANDLE,
  payload: { message },
});
const toggleChatMessageReaction = (id, emoji) => ({
  type: ActionTypes.CHAT_MESSAGE_REACTION_TOGGLE,
  payload: { id, emoji },
});

const markChatConversationAsRead = (conversationId) => ({
  type: ActionTypes.CHAT_CONVERSATION_READ,
  payload: { conversationId },
});
markChatConversationAsRead.success = (readState) => ({
  type: ActionTypes.CHAT_CONVERSATION_READ__SUCCESS,
  payload: { readState },
});
markChatConversationAsRead.failure = (conversationId, previousUnreadCount, error) => ({
  type: ActionTypes.CHAT_CONVERSATION_READ__FAILURE,
  payload: { conversationId, previousUnreadCount, error },
});
const handleChatConversationRead = (readState) => ({
  type: ActionTypes.CHAT_CONVERSATION_READ_HANDLE,
  payload: { readState },
});
const handleChatProjectAccessRevoke = (projectId, conversationIds) => ({
  type: ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE,
  payload: { projectId, conversationIds },
});
const handleChatConversationAccessRevoke = (projectId, conversationId) => ({
  type: ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE,
  payload: { projectId, conversationId },
});
const handleChatParticipantUpdate = (participant) => ({
  type: ActionTypes.CHAT_PARTICIPANT_UPDATE_HANDLE,
  payload: { participant },
});
const handleChatTypingUpdate = (typingState) => ({
  type: ActionTypes.CHAT_TYPING_UPDATE_HANDLE,
  payload: { typingState },
});
const handleChatMessageAlert = (alert) => ({
  type: ActionTypes.CHAT_MESSAGE_ALERT_HANDLE,
  payload: { alert },
});

const updateChatConversationPreferences = (conversationId, data) => ({
  type: ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE,
  payload: { conversationId, data },
});
updateChatConversationPreferences.success = (participant) => ({
  type: ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__SUCCESS,
  payload: { participant },
});
updateChatConversationPreferences.failure = (conversationId, previousData, error) => ({
  type: ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__FAILURE,
  payload: { conversationId, previousData, error },
});

const updateChatDraft = (conversationId, text) => ({
  type: ActionTypes.CHAT_DRAFT_UPDATE,
  payload: { conversationId, text },
});
const setChatReplyTarget = (conversationId, message) => ({
  type: ActionTypes.CHAT_REPLY_TARGET_SET,
  payload: { conversationId, message },
});

const openChatConversation = (id) => ({
  type: ActionTypes.CHAT_CONVERSATION_OPEN,
  payload: { id },
});
const closeChatConversation = (id) => ({
  type: ActionTypes.CHAT_CONVERSATION_CLOSE,
  payload: { id },
});
const toggleChatConversationMinimized = (id) => ({
  type: ActionTypes.CHAT_CONVERSATION_MINIMIZED_TOGGLE,
  payload: { id },
});

export default {
  fetchChatMembers,
  fetchChatConversations,
  createChatConversation,
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
  markChatConversationAsRead,
  handleChatConversationRead,
  handleChatProjectAccessRevoke,
  handleChatConversationAccessRevoke,
  handleChatParticipantUpdate,
  handleChatTypingUpdate,
  handleChatMessageAlert,
  updateChatConversationPreferences,
  updateChatDraft,
  setChatReplyTarget,
  openChatConversation,
  closeChatConversation,
  toggleChatConversationMinimized,
};
