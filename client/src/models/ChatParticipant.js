/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'ChatParticipant';

  static fields = {
    id: attr(),
    lastReadMessageId: attr(),
    lastReadAt: attr(),
    isMuted: attr(),
    notificationLevel: attr({ getDefault: () => 'all' }),
    mutedUntil: attr(),
    role: attr({ getDefault: () => 'member' }),
    createdAt: attr(),
    updatedAt: attr(),
    conversationId: fk({
      to: 'ChatConversation',
      as: 'conversation',
      relatedName: 'participants',
    }),
    userId: fk({
      to: 'User',
      as: 'user',
      relatedName: 'chatParticipations',
    }),
  };

  static reducer({ type, payload }, ChatParticipant) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        ChatParticipant.all().delete();
        break;
      case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE:
        ChatParticipant.filter(({ conversationId }) =>
          payload.conversationIds.includes(conversationId),
        ).delete();
        break;
      case ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE:
        ChatParticipant.filter({ conversationId: payload.conversationId }).delete();
        break;
      case ActionTypes.CHAT_CONVERSATIONS_FETCH__SUCCESS:
      case ActionTypes.CHAT_CONVERSATION_CREATE__SUCCESS:
      case ActionTypes.CHAT_CONVERSATION_CREATE_HANDLE:
      case ActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE:
        (payload.chatParticipants || []).forEach((participant) =>
          ChatParticipant.upsert(participant),
        );
        break;
      case ActionTypes.CHAT_CONVERSATION_READ__SUCCESS:
      case ActionTypes.CHAT_CONVERSATION_READ_HANDLE: {
        const participantModel = ChatParticipant.filter({
          conversationId: payload.readState.conversationId,
          userId: payload.readState.userId,
        }).first();

        if (participantModel) {
          participantModel.update({
            lastReadMessageId: payload.readState.lastReadMessageId,
            lastReadAt: payload.readState.lastReadAt,
          });
        }
        break;
      }
      case ActionTypes.CHAT_PARTICIPANT_UPDATE_HANDLE:
      case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__SUCCESS:
        ChatParticipant.upsert(payload.participant);
        break;
      default:
    }
  }
}
