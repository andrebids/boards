/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

const removeMatchingOptimisticMessage = (ChatMessage, message) => {
  if (!message.clientMessageId) {
    return;
  }

  ChatMessage.filter(
    ({ id, localId, clientMessageId, conversationId, userId }) =>
      id !== message.id &&
      Boolean(localId) &&
      clientMessageId === message.clientMessageId &&
      conversationId === message.conversationId &&
      userId === message.userId,
  )
    .toModelArray()
    .forEach((messageModel) => messageModel.delete());
};

export default class extends BaseModel {
  static modelName = 'ChatMessage';

  static fields = {
    id: attr(),
    localId: attr(),
    text: attr(),
    editedAt: attr(),
    deletedAt: attr(),
    createdAt: attr({ getDefault: () => new Date() }),
    updatedAt: attr(),
    isPending: attr({ getDefault: () => false }),
    isFailed: attr({ getDefault: () => false }),
    error: attr(),
    clientMessageId: attr(),
    replyToMessageId: attr(),
    replyTo: attr(),
    forwardedFromMessageId: attr(),
    forwardedFromUserId: attr(),
    linkPreviews: attr({ getDefault: () => [] }),
    pendingFiles: attr({ getDefault: () => [] }),
    attachments: attr({ getDefault: () => [] }),
    reactions: attr({ getDefault: () => [] }),
    conversationId: fk({
      to: 'ChatConversation',
      as: 'conversation',
      relatedName: 'messages',
    }),
    userId: fk({
      to: 'User',
      as: 'user',
      relatedName: 'chatMessages',
    }),
  };

  static reducer({ type, payload }, ChatMessage) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        ChatMessage.all()
          .toModelArray()
          .filter(({ isPending, isFailed }) => !isPending && !isFailed)
          .forEach((messageModel) => messageModel.delete());
        break;
      case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE:
        ChatMessage.filter(({ conversationId }) =>
          payload.conversationIds.includes(conversationId),
        ).delete();
        break;
      case ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE:
        ChatMessage.filter({ conversationId: payload.conversationId }).delete();
        break;
      case ActionTypes.CHAT_MESSAGES_FETCH__SUCCESS:
        if (payload.replace) {
          ChatMessage.filter({ conversationId: payload.conversationId })
            .toModelArray()
            .filter(({ isPending, isFailed }) => !isPending && !isFailed)
            .forEach((messageModel) => messageModel.delete());
        }
        payload.messages.forEach((message) => ChatMessage.upsert(message));
        break;
      case ActionTypes.CHAT_MESSAGE_CREATE:
        ChatMessage.upsert(payload.message);
        break;
      case ActionTypes.CHAT_MESSAGE_CREATE__SUCCESS: {
        const localModel = ChatMessage.withId(payload.localId);
        if (localModel) {
          localModel.delete();
        }
        ChatMessage.upsert(payload.message);
        break;
      }
      case ActionTypes.CHAT_MESSAGE_CREATE__FAILURE: {
        const messageModel = ChatMessage.withId(payload.localId);
        if (messageModel) {
          messageModel.update({ isPending: false, isFailed: true, error: payload.error });
        }
        break;
      }
      case ActionTypes.CHAT_MESSAGE_RETRY: {
        const messageModel = ChatMessage.withId(payload.localId);
        if (messageModel) {
          messageModel.update({ isPending: true, isFailed: false, error: null });
        }
        break;
      }
      case ActionTypes.CHAT_MESSAGE_CREATE_HANDLE:
      case ActionTypes.CHAT_MESSAGE_UPDATE__SUCCESS:
      case ActionTypes.CHAT_MESSAGE_UPDATE_HANDLE:
      case ActionTypes.CHAT_MESSAGE_DELETE__SUCCESS:
      case ActionTypes.CHAT_MESSAGE_DELETE_HANDLE:
        removeMatchingOptimisticMessage(ChatMessage, payload.message);
        ChatMessage.upsert({ ...payload.message, isPending: false, isFailed: false });
        break;
      case ActionTypes.CHAT_MESSAGE_UPDATE: {
        const messageModel = ChatMessage.withId(payload.id);
        if (messageModel) {
          messageModel.update({ ...payload.data, error: null });
        }
        break;
      }
      case ActionTypes.CHAT_MESSAGE_UPDATE__FAILURE: {
        const messageModel = ChatMessage.withId(payload.id);
        if (messageModel) {
          messageModel.update({ ...payload.previousData, error: payload.error });
        }
        break;
      }
      case ActionTypes.CHAT_MESSAGE_DELETE__FAILURE: {
        const messageModel = ChatMessage.withId(payload.id);
        if (messageModel) {
          messageModel.error = payload.error;
        }
        break;
      }
      default:
    }
  }
}
