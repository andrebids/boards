/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery, takeLatest } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';
import ActionTypes from '../../../constants/ActionTypes';

export default function* chatWatchers() {
  yield all([
    takeLatest(EntryActionTypes.CHAT_INBOX_FETCH, () => services.fetchChatInbox()),
    takeEvery(EntryActionTypes.CHAT_INBOX_READ, ({ payload: { conversationIds } }) =>
      services.markAllChatInboxAsRead(conversationIds),
    ),
    takeLatest(ActionTypes.SOCKET_RECONNECT_HANDLE, () => services.fetchChatInbox()),
    takeLatest(EntryActionTypes.CHAT_FOR_CURRENT_PROJECT_FETCH, () =>
      services.fetchChatForCurrentProject(),
    ),
    takeLatest(EntryActionTypes.CHAT_MEMBERS_FETCH, ({ payload: { projectId } }) =>
      services.fetchChatMembers(projectId),
    ),
    takeLatest(EntryActionTypes.CHAT_CONVERSATIONS_FETCH, ({ payload: { projectId } }) =>
      services.fetchChatConversations(projectId),
    ),
    takeEvery(EntryActionTypes.GENERAL_CHAT_CONVERSATION_CREATE, ({ payload: { projectId } }) =>
      services.createGeneralChatConversation(projectId),
    ),
    takeEvery(
      EntryActionTypes.DIRECT_CHAT_CONVERSATION_CREATE,
      ({ payload: { projectId, userId } }) =>
        services.createDirectChatConversation(projectId, userId),
    ),
    takeEvery(
      EntryActionTypes.CUSTOM_CHAT_GROUP_CREATE,
      ({ payload: { projectId, data, requestKey } }) =>
        services.createCustomChatGroup(projectId, data, requestKey),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_UPDATE, ({ payload: { id, data } }) =>
      services.updateChatConversation(id, data),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_PARTICIPANTS_ADD, ({ payload: { id, userIds } }) =>
      services.addChatConversationParticipants(id, userIds),
    ),
    takeEvery(
      EntryActionTypes.CHAT_CONVERSATION_PARTICIPANT_DELETE,
      ({ payload: { id, userId } }) => services.deleteChatConversationParticipant(id, userId),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_LEAVE, ({ payload: { id } }) =>
      services.leaveChatConversation(id),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE, ({ payload: { id, data } }) =>
      services.updateChatConversationPreferences(id, data),
    ),
    takeEvery(EntryActionTypes.CHAT_TYPING_UPDATE, ({ payload: { id, isTyping } }) =>
      services.updateChatTyping(id, isTyping),
    ),
    takeEvery(
      EntryActionTypes.CHAT_CONVERSATION_CREATE_HANDLE,
      ({ payload: { conversation, chatParticipants, users } }) =>
        services.handleChatConversationCreate(conversation, chatParticipants, users),
    ),
    takeEvery(
      EntryActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE,
      ({ payload: { conversation, chatParticipants, users } }) =>
        services.handleChatConversationUpdate(conversation, chatParticipants, users),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGES_FETCH, ({ payload: { conversationId, options } }) =>
      services.fetchChatMessages(conversationId, options),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_CREATE, ({ payload: { conversationId, data } }) =>
      services.createChatMessage(conversationId, data),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_RETRY, ({ payload: { localId } }) =>
      services.retryChatMessage(localId),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_CREATE_HANDLE, ({ payload: { message, users } }) =>
      services.handleChatMessageCreate(message, users),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_UPDATE, ({ payload: { id, data } }) =>
      services.updateChatMessage(id, data),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_UPDATE_HANDLE, ({ payload: { message } }) =>
      services.handleChatMessageUpdate(message),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_DELETE, ({ payload: { id } }) =>
      services.deleteChatMessage(id),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_DELETE_HANDLE, ({ payload: { message } }) =>
      services.handleChatMessageDelete(message),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_REACTION_TOGGLE, ({ payload: { id, emoji } }) =>
      services.toggleChatMessageReaction(id, emoji),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_READ, ({ payload: { id } }) =>
      services.markChatConversationAsRead(id),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_READ_HANDLE, ({ payload: { readState } }) =>
      services.handleChatConversationRead(readState),
    ),
    takeEvery(EntryActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE, ({ payload: { projectId } }) =>
      services.handleChatProjectAccessRevoke(projectId),
    ),
    takeEvery(
      EntryActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE,
      ({ payload: { projectId, conversationId } }) =>
        services.handleChatConversationAccessRevoke(projectId, conversationId),
    ),
    takeEvery(EntryActionTypes.CHAT_PARTICIPANT_UPDATE_HANDLE, ({ payload: { participant } }) =>
      services.handleChatParticipantUpdate(participant),
    ),
    takeEvery(EntryActionTypes.CHAT_TYPING_UPDATE_HANDLE, ({ payload: { typingState } }) =>
      services.handleChatTypingUpdate(typingState),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_ALERT_HANDLE, ({ payload: { alert } }) =>
      services.handleChatMessageAlert(alert),
    ),
    takeEvery(EntryActionTypes.CHAT_MESSAGE_FORWARD, ({ payload: { id, targetConversationId } }) =>
      services.forwardChatMessage(id, targetConversationId),
    ),
    takeEvery(EntryActionTypes.CHAT_DRAFT_UPDATE, ({ payload: { conversationId, text } }) =>
      services.updateChatDraft(conversationId, text),
    ),
    takeEvery(EntryActionTypes.CHAT_REPLY_TARGET_SET, ({ payload: { conversationId, message } }) =>
      services.setChatReplyTarget(conversationId, message),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_OPEN, ({ payload: { id } }) =>
      services.openChatConversation(id),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_CLOSE, ({ payload: { id } }) =>
      services.closeChatConversation(id),
    ),
    takeEvery(EntryActionTypes.CHAT_CONVERSATION_MINIMIZED_TOGGLE, ({ payload: { id } }) =>
      services.toggleChatConversationMinimized(id),
    ),
  ]);
}
