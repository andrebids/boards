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
  errorsByScope: {},
  conversationCreationErrorsByKey: {},
  accessRevocationVersionByProject: {},
  draftsByConversation: {},
  replyTargetsByConversation: {},
  typingByConversation: {},
  isSavedMessagesFetchingByProject: {},
  hasMoreSavedMessagesByProject: {},
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
        typingByConversation: {},
      };
    case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE: {
      const conversationIdSet = new Set(payload.conversationIds);
      const nextMessagesFetching = { ...state.isMessagesFetchingByConversation };
      const nextHasMoreMessages = { ...state.hasMoreMessagesByConversation };
      const nextDrafts = { ...state.draftsByConversation };
      const nextReplyTargets = { ...state.replyTargetsByConversation };
      const nextTyping = { ...state.typingByConversation };
      payload.conversationIds.forEach((conversationId) => {
        delete nextMessagesFetching[conversationId];
        delete nextHasMoreMessages[conversationId];
        delete nextDrafts[conversationId];
        delete nextReplyTargets[conversationId];
        delete nextTyping[conversationId];
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
        isMessagesFetchingByConversation: nextMessagesFetching,
        hasMoreMessagesByConversation: nextHasMoreMessages,
        draftsByConversation: nextDrafts,
        replyTargetsByConversation: nextReplyTargets,
        typingByConversation: nextTyping,
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
      return {
        ...state,
        conversationCreationErrorsByKey: nextCreationErrors,
      };
    }
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
          [payload.conversationId]: payload.hasMore,
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
    case ActionTypes.CHAT_SAVED_MESSAGES_FETCH:
      return {
        ...state,
        isSavedMessagesFetchingByProject: {
          ...state.isSavedMessagesFetchingByProject,
          [payload.projectId]: true,
        },
      };
    case ActionTypes.CHAT_SAVED_MESSAGES_FETCH__SUCCESS:
      return {
        ...state,
        isSavedMessagesFetchingByProject: {
          ...state.isSavedMessagesFetchingByProject,
          [payload.projectId]: false,
        },
        hasMoreSavedMessagesByProject: {
          ...state.hasMoreSavedMessagesByProject,
          [payload.projectId]: payload.hasMore,
        },
      };
    case ActionTypes.CHAT_SAVED_MESSAGES_FETCH__FAILURE:
      return {
        ...state,
        isSavedMessagesFetchingByProject: {
          ...state.isSavedMessagesFetchingByProject,
          [payload.projectId]: false,
        },
        errorsByScope: {
          ...state.errorsByScope,
          [`saved:${payload.projectId}`]: payload.error,
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
