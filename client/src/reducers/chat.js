/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  memberIdsByProject: {},
  openConversationIds: [],
  minimizedConversationIds: [],
  isMembersFetchingByProject: {},
  isConversationsFetchingByProject: {},
  hasFetchedConversationsByProject: {},
  isMessagesFetchingByConversation: {},
  hasMoreMessagesByConversation: {},
  hasMoreNewerMessagesByConversation: {},
  errorsByScope: {},
  conversationCreationErrorsByKey: {},
  createdConversationIdByRequestKey: {},
  lastMessageAlert: null,
  accessRevocationVersionByProject: {},
  draftsByConversation: {},
  replyTargetsByConversation: {},
  typingByConversation: {},
  isPreferencesUpdatingByConversation: {},
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.SOCKET_RECONNECT_HANDLE:
      return {
        ...state,
        memberIdsByProject: {},
        isMembersFetchingByProject: {},
        isConversationsFetchingByProject: {},
        hasFetchedConversationsByProject: {},
        isMessagesFetchingByConversation: {},
        hasMoreMessagesByConversation: {},
        hasMoreNewerMessagesByConversation: {},
        typingByConversation: {},
      };
    case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE: {
      const conversationIdSet = new Set(payload.conversationIds);
      const nextMessagesFetching = { ...state.isMessagesFetchingByConversation };
      const nextHasMoreMessages = { ...state.hasMoreMessagesByConversation };
      const nextHasMoreNewerMessages = { ...state.hasMoreNewerMessagesByConversation };
      const nextDrafts = { ...state.draftsByConversation };
      const nextReplyTargets = { ...state.replyTargetsByConversation };
      const nextTyping = { ...state.typingByConversation };
      const nextPreferencesUpdating = { ...state.isPreferencesUpdatingByConversation };
      const nextErrors = { ...state.errorsByScope };
      const nextMembersFetching = { ...state.isMembersFetchingByProject };
      const nextConversationsFetching = { ...state.isConversationsFetchingByProject };
      const nextFetchedConversations = { ...state.hasFetchedConversationsByProject };
      const nextCreationErrors = { ...state.conversationCreationErrorsByKey };
      const nextCreatedConversationIds = { ...state.createdConversationIdByRequestKey };
      delete nextMembersFetching[payload.projectId];
      delete nextConversationsFetching[payload.projectId];
      delete nextFetchedConversations[payload.projectId];
      delete nextErrors[`members:${payload.projectId}`];
      delete nextErrors[`conversations:${payload.projectId}`];
      Object.keys(nextCreationErrors)
        .filter((key) => key.startsWith(`${payload.projectId}:`))
        .forEach((key) => delete nextCreationErrors[key]);
      Object.keys(nextCreatedConversationIds)
        .filter((key) => key.startsWith(`${payload.projectId}:`))
        .forEach((key) => delete nextCreatedConversationIds[key]);
      payload.conversationIds.forEach((conversationId) => {
        delete nextMessagesFetching[conversationId];
        delete nextHasMoreMessages[conversationId];
        delete nextHasMoreNewerMessages[conversationId];
        delete nextDrafts[conversationId];
        delete nextReplyTargets[conversationId];
        delete nextTyping[conversationId];
        delete nextPreferencesUpdating[conversationId];
        delete nextErrors[`messages:${conversationId}`];
      });

      return {
        ...state,
        memberIdsByProject: {
          ...state.memberIdsByProject,
          [payload.projectId]: [],
        },
        openConversationIds: state.openConversationIds.filter((id) => !conversationIdSet.has(id)),
        minimizedConversationIds: state.minimizedConversationIds.filter(
          (id) => !conversationIdSet.has(id),
        ),
        isMembersFetchingByProject: nextMembersFetching,
        isConversationsFetchingByProject: nextConversationsFetching,
        hasFetchedConversationsByProject: nextFetchedConversations,
        isMessagesFetchingByConversation: nextMessagesFetching,
        hasMoreMessagesByConversation: nextHasMoreMessages,
        hasMoreNewerMessagesByConversation: nextHasMoreNewerMessages,
        errorsByScope: nextErrors,
        conversationCreationErrorsByKey: nextCreationErrors,
        createdConversationIdByRequestKey: nextCreatedConversationIds,
        draftsByConversation: nextDrafts,
        replyTargetsByConversation: nextReplyTargets,
        typingByConversation: nextTyping,
        isPreferencesUpdatingByConversation: nextPreferencesUpdating,
        lastMessageAlert:
          state.lastMessageAlert?.projectId === payload.projectId ? null : state.lastMessageAlert,
        accessRevocationVersionByProject: {
          ...state.accessRevocationVersionByProject,
          [payload.projectId]: (state.accessRevocationVersionByProject[payload.projectId] || 0) + 1,
        },
      };
    }
    case ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE: {
      const removeKey = (source) => {
        const result = { ...source };
        delete result[payload.conversationId];
        return result;
      };
      return {
        ...state,
        openConversationIds: state.openConversationIds.filter(
          (id) => id !== payload.conversationId,
        ),
        minimizedConversationIds: state.minimizedConversationIds.filter(
          (id) => id !== payload.conversationId,
        ),
        isMessagesFetchingByConversation: removeKey(state.isMessagesFetchingByConversation),
        hasMoreMessagesByConversation: removeKey(state.hasMoreMessagesByConversation),
        hasMoreNewerMessagesByConversation: removeKey(state.hasMoreNewerMessagesByConversation),
        draftsByConversation: removeKey(state.draftsByConversation),
        replyTargetsByConversation: removeKey(state.replyTargetsByConversation),
        typingByConversation: removeKey(state.typingByConversation),
      };
    }
    case ActionTypes.CHAT_MEMBERS_FETCH:
      return {
        ...state,
        isMembersFetchingByProject: {
          ...state.isMembersFetchingByProject,
          [payload.projectId]: true,
        },
      };
    case ActionTypes.CHAT_MEMBERS_FETCH__SUCCESS:
      return {
        ...state,
        memberIdsByProject: {
          ...state.memberIdsByProject,
          [payload.projectId]: payload.users.map((user) => user.id),
        },
        isMembersFetchingByProject: {
          ...state.isMembersFetchingByProject,
          [payload.projectId]: false,
        },
      };
    case ActionTypes.CHAT_MEMBERS_FETCH__FAILURE:
      return {
        ...state,
        isMembersFetchingByProject: {
          ...state.isMembersFetchingByProject,
          [payload.projectId]: false,
        },
        errorsByScope: {
          ...state.errorsByScope,
          [`members:${payload.projectId}`]: payload.error,
        },
      };
    case ActionTypes.CHAT_CONVERSATIONS_FETCH:
      return {
        ...state,
        isConversationsFetchingByProject: {
          ...state.isConversationsFetchingByProject,
          [payload.projectId]: true,
        },
      };
    case ActionTypes.CHAT_CONVERSATIONS_FETCH__SUCCESS:
      return {
        ...state,
        isConversationsFetchingByProject: {
          ...state.isConversationsFetchingByProject,
          [payload.projectId]: false,
        },
        hasFetchedConversationsByProject: {
          ...state.hasFetchedConversationsByProject,
          [payload.projectId]: true,
        },
      };
    case ActionTypes.CHAT_CONVERSATIONS_FETCH__FAILURE:
      return {
        ...state,
        isConversationsFetchingByProject: {
          ...state.isConversationsFetchingByProject,
          [payload.projectId]: false,
        },
        errorsByScope: {
          ...state.errorsByScope,
          [`conversations:${payload.projectId}`]: payload.error,
        },
      };
    case ActionTypes.CHAT_CONVERSATION_CREATE: {
      const nextCreationErrors = { ...state.conversationCreationErrorsByKey };
      delete nextCreationErrors[payload.requestKey];
      const nextCreatedConversationIds = { ...state.createdConversationIdByRequestKey };
      delete nextCreatedConversationIds[payload.requestKey];
      return {
        ...state,
        conversationCreationErrorsByKey: nextCreationErrors,
        createdConversationIdByRequestKey: nextCreatedConversationIds,
      };
    }
    case ActionTypes.CHAT_CONVERSATION_CREATE__SUCCESS:
      return payload.requestKey
        ? {
            ...state,
            createdConversationIdByRequestKey: {
              ...state.createdConversationIdByRequestKey,
              [payload.requestKey]: payload.conversation.id,
            },
          }
        : state;
    case ActionTypes.CHAT_CONVERSATION_CREATE__FAILURE:
      return {
        ...state,
        conversationCreationErrorsByKey: {
          ...state.conversationCreationErrorsByKey,
          [payload.requestKey]: payload.error,
        },
      };
    case ActionTypes.CHAT_MESSAGES_FETCH:
      return {
        ...state,
        isMessagesFetchingByConversation: {
          ...state.isMessagesFetchingByConversation,
          [payload.conversationId]: true,
        },
      };
    case ActionTypes.CHAT_MESSAGES_FETCH__SUCCESS:
      return {
        ...state,
        isMessagesFetchingByConversation: {
          ...state.isMessagesFetchingByConversation,
          [payload.conversationId]: false,
        },
        hasMoreMessagesByConversation: {
          ...state.hasMoreMessagesByConversation,
          ...(payload.direction !== 'after' && {
            [payload.conversationId]: payload.hasMore,
          }),
        },
        hasMoreNewerMessagesByConversation: {
          ...state.hasMoreNewerMessagesByConversation,
          [payload.conversationId]: payload.hasMoreAfter,
        },
      };
    case ActionTypes.CHAT_MESSAGES_FETCH__FAILURE:
      return {
        ...state,
        isMessagesFetchingByConversation: {
          ...state.isMessagesFetchingByConversation,
          [payload.conversationId]: false,
        },
        errorsByScope: {
          ...state.errorsByScope,
          [`messages:${payload.conversationId}`]: payload.error,
        },
      };
    case ActionTypes.CHAT_CONVERSATION_OPEN:
      return {
        ...state,
        openConversationIds: state.openConversationIds.includes(payload.id)
          ? state.openConversationIds
          : [...state.openConversationIds, payload.id],
        minimizedConversationIds: state.minimizedConversationIds.filter((id) => id !== payload.id),
      };
    case ActionTypes.CHAT_CONVERSATION_CLOSE:
      return {
        ...state,
        openConversationIds: state.openConversationIds.filter((id) => id !== payload.id),
        minimizedConversationIds: state.minimizedConversationIds.filter((id) => id !== payload.id),
      };
    case ActionTypes.CHAT_CONVERSATION_MINIMIZED_TOGGLE:
      return {
        ...state,
        minimizedConversationIds: state.minimizedConversationIds.includes(payload.id)
          ? state.minimizedConversationIds.filter((id) => id !== payload.id)
          : [...state.minimizedConversationIds, payload.id],
      };
    case ActionTypes.CHAT_DRAFT_UPDATE:
      return {
        ...state,
        draftsByConversation: {
          ...state.draftsByConversation,
          [payload.conversationId]: payload.text,
        },
      };
    case ActionTypes.CHAT_REPLY_TARGET_SET:
      return {
        ...state,
        replyTargetsByConversation: {
          ...state.replyTargetsByConversation,
          [payload.conversationId]: payload.message || null,
        },
      };
    case ActionTypes.CHAT_TYPING_UPDATE_HANDLE: {
      const { conversationId, userId, isTyping, receivedAt } = payload.typingState;
      const conversationTyping = { ...(state.typingByConversation[conversationId] || {}) };
      if (isTyping) {
        conversationTyping[userId] = receivedAt;
      } else if (!receivedAt || conversationTyping[userId] === receivedAt) {
        delete conversationTyping[userId];
      }
      return {
        ...state,
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: conversationTyping,
        },
      };
    }
    case ActionTypes.CHAT_MESSAGE_ALERT_HANDLE:
      return {
        ...state,
        lastMessageAlert: {
          ...payload.alert,
          receivedAt: Date.now(),
        },
      };
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE:
      return {
        ...state,
        isPreferencesUpdatingByConversation: {
          ...state.isPreferencesUpdatingByConversation,
          [payload.conversationId]: true,
        },
      };
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__SUCCESS:
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__FAILURE:
      return {
        ...state,
        isPreferencesUpdatingByConversation: {
          ...state.isPreferencesUpdatingByConversation,
          [payload.participant?.conversationId || payload.conversationId]: false,
        },
      };
    default:
      return state;
  }
};
