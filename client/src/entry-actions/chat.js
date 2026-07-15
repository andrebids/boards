/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const fetchChatInbox = () => ({
  type: EntryActionTypes.CHAT_INBOX_FETCH,
  payload: {},
});
const markAllChatInboxAsRead = (conversationIds) => ({
  type: EntryActionTypes.CHAT_INBOX_READ,
  payload: { conversationIds },
});

const fetchChatForCurrentProject = () => ({
  type: EntryActionTypes.CHAT_FOR_CURRENT_PROJECT_FETCH,
  payload: {},
});
const fetchChatMembers = (projectId) => ({
  type: EntryActionTypes.CHAT_MEMBERS_FETCH,
  payload: { projectId },
});
const fetchChatConversations = (projectId) => ({
  type: EntryActionTypes.CHAT_CONVERSATIONS_FETCH,
  payload: { projectId },
});
const createGeneralChatConversation = (projectId) => ({
  type: EntryActionTypes.GENERAL_CHAT_CONVERSATION_CREATE,
  payload: { projectId },
});
const createDirectChatConversation = (projectId, userId) => ({
  type: EntryActionTypes.DIRECT_CHAT_CONVERSATION_CREATE,
  payload: { projectId, userId },
});
const createCustomChatGroup = (projectId, data, requestKey) => ({
  type: EntryActionTypes.CUSTOM_CHAT_GROUP_CREATE,
  payload: { projectId, data, requestKey },
});
const updateChatConversation = (id, data) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_UPDATE,
  payload: { id, data },
});
const addChatConversationParticipants = (id, userIds) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_PARTICIPANTS_ADD,
  payload: { id, userIds },
});
const deleteChatConversationParticipant = (id, userId) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_PARTICIPANT_DELETE,
  payload: { id, userId },
});
const leaveChatConversation = (id) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_LEAVE,
  payload: { id },
});
const updateChatConversationPreferences = (id, data) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE,
  payload: { id, data },
});
const updateChatTyping = (id, isTyping) => ({
  type: EntryActionTypes.CHAT_TYPING_UPDATE,
  payload: { id, isTyping },
});
const handleChatConversationCreate = (conversation, chatParticipants, users) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_CREATE_HANDLE,
  payload: { conversation, chatParticipants, users },
});
const handleChatConversationUpdate = (conversation, chatParticipants, users) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE,
  payload: { conversation, chatParticipants, users },
});
const fetchChatMessages = (conversationId, options) => ({
  type: EntryActionTypes.CHAT_MESSAGES_FETCH,
  payload: { conversationId, options },
});
const createChatMessage = (conversationId, data) => ({
  type: EntryActionTypes.CHAT_MESSAGE_CREATE,
  payload: { conversationId, data },
});
const retryChatMessage = (localId) => ({
  type: EntryActionTypes.CHAT_MESSAGE_RETRY,
  payload: { localId },
});
const handleChatMessageCreate = (message, users) => ({
  type: EntryActionTypes.CHAT_MESSAGE_CREATE_HANDLE,
  payload: { message, users },
});
const updateChatMessage = (id, data) => ({
  type: EntryActionTypes.CHAT_MESSAGE_UPDATE,
  payload: { id, data },
});
const handleChatMessageUpdate = (message) => ({
  type: EntryActionTypes.CHAT_MESSAGE_UPDATE_HANDLE,
  payload: { message },
});
const deleteChatMessage = (id) => ({
  type: EntryActionTypes.CHAT_MESSAGE_DELETE,
  payload: { id },
});
const handleChatMessageDelete = (message) => ({
  type: EntryActionTypes.CHAT_MESSAGE_DELETE_HANDLE,
  payload: { message },
});
const toggleChatMessageReaction = (id, emoji) => ({
  type: EntryActionTypes.CHAT_MESSAGE_REACTION_TOGGLE,
  payload: { id, emoji },
});
const markChatConversationAsRead = (id) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_READ,
  payload: { id },
});
const handleChatConversationRead = (readState) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_READ_HANDLE,
  payload: { readState },
});
const handleChatProjectAccessRevoke = (projectId) => ({
  type: EntryActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE,
  payload: { projectId },
});
const handleChatConversationAccessRevoke = (projectId, conversationId) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE,
  payload: { projectId, conversationId },
});
const handleChatParticipantUpdate = (participant) => ({
  type: EntryActionTypes.CHAT_PARTICIPANT_UPDATE_HANDLE,
  payload: { participant },
});
const handleChatTypingUpdate = (typingState) => ({
  type: EntryActionTypes.CHAT_TYPING_UPDATE_HANDLE,
  payload: { typingState },
});
const handleChatMessageAlert = (alert) => ({
  type: EntryActionTypes.CHAT_MESSAGE_ALERT_HANDLE,
  payload: { alert },
});
const forwardChatMessage = (id, targetConversationId) => ({
  type: EntryActionTypes.CHAT_MESSAGE_FORWARD,
  payload: { id, targetConversationId },
});
const updateChatDraft = (conversationId, text) => ({
  type: EntryActionTypes.CHAT_DRAFT_UPDATE,
  payload: { conversationId, text },
});
const setChatReplyTarget = (conversationId, message) => ({
  type: EntryActionTypes.CHAT_REPLY_TARGET_SET,
  payload: { conversationId, message },
});
const openChatConversation = (id) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_OPEN,
  payload: { id },
});
const closeChatConversation = (id) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_CLOSE,
  payload: { id },
});
const toggleChatConversationMinimized = (id) => ({
  type: EntryActionTypes.CHAT_CONVERSATION_MINIMIZED_TOGGLE,
  payload: { id },
});

export default {
  fetchChatInbox,
  markAllChatInboxAsRead,
  fetchChatForCurrentProject,
  fetchChatMembers,
  fetchChatConversations,
  createGeneralChatConversation,
  createDirectChatConversation,
  createCustomChatGroup,
  updateChatConversation,
  addChatConversationParticipants,
  deleteChatConversationParticipant,
  leaveChatConversation,
  updateChatConversationPreferences,
  updateChatTyping,
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
  forwardChatMessage,
  updateChatDraft,
  setChatReplyTarget,
  openChatConversation,
  closeChatConversation,
  toggleChatConversationMinimized,
};
