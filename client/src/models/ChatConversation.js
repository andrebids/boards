/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'ChatConversation';

  static fields = {
    id: attr(),
    type: attr(),
    title: attr(),
    archivedAt: attr(),
    directKey: attr(),
    unreadCount: attr({ getDefault: () => 0 }),
    lastMessage: attr(),
    lastMessageAt: attr(),
    isBlocked: attr({ getDefault: () => false }),
    createdAt: attr(),
    updatedAt: attr(),
    projectId: fk({
      to: 'Project',
      as: 'project',
      relatedName: 'chatConversations',
    }),
    createdByUserId: fk({
      to: 'User',
      as: 'createdByUser',
      relatedName: 'createdChatConversations',
    }),
  };

  static reducer({ type, payload }, ChatConversation) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        break;
      case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE:
        ChatConversation.filter({ projectId: payload.projectId }).delete();
        break;
      case ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE:
        ChatConversation.withId(payload.conversationId)?.delete();
        break;
      case ActionTypes.CHAT_CONVERSATIONS_FETCH__SUCCESS:
        ChatConversation.filter({ projectId: payload.projectId })
          .toModelArray()
          .filter(({ id }) => !payload.conversations.some((conversation) => conversation.id === id))
          .forEach((conversationModel) => conversationModel.delete());
        payload.conversations.forEach((conversation) => ChatConversation.upsert(conversation));
        break;
      case ActionTypes.CHAT_CONVERSATION_CREATE__SUCCESS:
      case ActionTypes.CHAT_CONVERSATION_CREATE_HANDLE:
      case ActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE:
        ChatConversation.upsert(payload.conversation);
        break;
      case ActionTypes.CHAT_MESSAGE_CREATE:
      case ActionTypes.CHAT_MESSAGE_CREATE__SUCCESS:
      case ActionTypes.CHAT_MESSAGE_CREATE_HANDLE: {
        const { conversationId } = payload.message;
        const conversationModel = ChatConversation.withId(conversationId);

        if (conversationModel) {
          conversationModel.update({
            lastMessage: payload.message,
            lastMessageAt: payload.message.createdAt,
          });
        }
        break;
      }
      case ActionTypes.CHAT_MESSAGE_UPDATE__SUCCESS:
      case ActionTypes.CHAT_MESSAGE_UPDATE_HANDLE:
      case ActionTypes.CHAT_MESSAGE_DELETE__SUCCESS:
      case ActionTypes.CHAT_MESSAGE_DELETE_HANDLE: {
        const conversationModel = ChatConversation.withId(payload.message.conversationId);

        if (conversationModel?.lastMessage?.id === payload.message.id) {
          conversationModel.lastMessage = payload.message;
        }
        break;
      }
      case ActionTypes.CHAT_CONVERSATION_READ: {
        const conversationModel = ChatConversation.withId(payload.conversationId);
        if (conversationModel) {
          conversationModel.unreadCount = 0;
        }
        break;
      }
      case ActionTypes.CHAT_CONVERSATION_READ__SUCCESS:
      case ActionTypes.CHAT_CONVERSATION_READ_HANDLE: {
        const conversationModel = ChatConversation.withId(payload.readState.conversationId);
        if (conversationModel) {
          const unreadCount = payload.readState.unreadCount || 0;
          const lastMessageId = conversationModel.lastMessage?.id;
          const hasMessageAfterReadCursor =
            lastMessageId &&
            payload.readState.lastReadMessageId &&
            lastMessageId !== payload.readState.lastReadMessageId;

          conversationModel.unreadCount = hasMessageAfterReadCursor
            ? Math.max(conversationModel.unreadCount || 0, unreadCount)
            : unreadCount;
        }
        break;
      }
      case ActionTypes.CHAT_CONVERSATION_READ__FAILURE: {
        const conversationModel = ChatConversation.withId(payload.conversationId);
        if (conversationModel) {
          conversationModel.unreadCount = payload.previousUnreadCount;
        }
        break;
      }
      default:
    }
  }
}
