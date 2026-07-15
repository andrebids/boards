/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const getInboxConversationId = (item) => item?.conversationId || item?.id;
const getInboxUnreadCount = (item) => Math.max(Number(item?.unreadCount) || 0, 0);

const restoreInboxItemAfterReadFailure = (currentItem, previousItem) => ({
  ...previousItem,
  ...currentItem,
  unreadCount: Math.max(getInboxUnreadCount(currentItem), getInboxUnreadCount(previousItem)),
  hasUnreadMention: Boolean(currentItem?.hasUnreadMention || previousItem?.hasUnreadMention),
  firstUnreadMessageId:
    previousItem?.firstUnreadMessageId || currentItem?.firstUnreadMessageId || null,
});

const updateInboxMetaForItemChange = (meta, previousItem, nextItem) => {
  const previousUnreadCount = getInboxUnreadCount(previousItem);
  const nextUnreadCount = getInboxUnreadCount(nextItem);
  const previousUnreadConversation = previousUnreadCount > 0 ? 1 : 0;
  const nextUnreadConversation = nextUnreadCount > 0 ? 1 : 0;
  const nextMeta = { ...meta };

  if (typeof nextMeta.unreadConversationTotal === 'number') {
    nextMeta.unreadConversationTotal = Math.max(
      nextMeta.unreadConversationTotal + nextUnreadConversation - previousUnreadConversation,
      0,
    );
  }
  if (typeof nextMeta.unreadMessageTotal === 'number') {
    nextMeta.unreadMessageTotal = Math.max(
      nextMeta.unreadMessageTotal + nextUnreadCount - previousUnreadCount,
      0,
    );
  }
  if (nextMeta.unreadConversationTotalsByProjectId) {
    const totalsByProjectId = {
      ...nextMeta.unreadConversationTotalsByProjectId,
    };
    const previousProjectId = previousItem?.projectId;
    const nextProjectId = nextItem?.projectId;

    if (previousProjectId && previousUnreadConversation) {
      totalsByProjectId[previousProjectId] = Math.max(
        (totalsByProjectId[previousProjectId] || 0) - 1,
        0,
      );
    }
    if (nextProjectId && nextUnreadConversation) {
      totalsByProjectId[nextProjectId] = (totalsByProjectId[nextProjectId] || 0) + 1;
    }
    nextMeta.unreadConversationTotalsByProjectId = totalsByProjectId;
  }

  return nextMeta;
};

const initialState = {
  inboxItemsByConversationId: {},
  isInboxFetching: false,
  hasFetchedInbox: false,
  inboxError: null,
  inboxMeta: {},
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
        isInboxFetching: false,
        hasFetchedInbox: false,
        inboxError: null,
        memberIdsByProject: {},
        isMembersFetchingByProject: {},
        isConversationsFetchingByProject: {},
        hasFetchedConversationsByProject: {},
        isMessagesFetchingByConversation: {},
        hasMoreMessagesByConversation: {},
        hasMoreNewerMessagesByConversation: {},
        typingByConversation: {},
      };
    case ActionTypes.CHAT_INBOX_FETCH:
      return {
        ...state,
        isInboxFetching: true,
        inboxError: null,
      };
    case ActionTypes.CHAT_INBOX_FETCH__SUCCESS:
      return {
        ...state,
        inboxItemsByConversationId: payload.items.reduce((result, item) => {
          const conversationId = getInboxConversationId(item);
          return conversationId
            ? {
                ...result,
                [conversationId]: { ...item, conversationId },
              }
            : result;
        }, {}),
        isInboxFetching: false,
        hasFetchedInbox: true,
        inboxError: null,
        inboxMeta: payload.meta || {},
      };
    case ActionTypes.CHAT_INBOX_FETCH__FAILURE:
      return {
        ...state,
        isInboxFetching: false,
        inboxError: payload.error,
      };
    case ActionTypes.CHAT_INBOX_ITEM_UPDATE_HANDLE: {
      const conversationId = getInboxConversationId(payload.item);
      const previousItem = state.inboxItemsByConversationId[conversationId];
      const canInsertItem = conversationId && payload.item.projectId;
      if (!conversationId || (!previousItem && !canInsertItem)) {
        return state;
      }
      const nextItem = {
        ...previousItem,
        ...payload.item,
        conversationId,
      };
      const inboxMeta = updateInboxMetaForItemChange(state.inboxMeta, previousItem, nextItem);
      return {
        ...state,
        inboxItemsByConversationId: {
          ...state.inboxItemsByConversationId,
          [conversationId]: nextItem,
        },
        inboxMeta: previousItem ? inboxMeta : { ...inboxMeta, hasChatAccess: true },
        isPreferencesUpdatingByConversation: payload.isPreferencesUpdateComplete
          ? {
              ...state.isPreferencesUpdatingByConversation,
              [conversationId]: false,
            }
          : state.isPreferencesUpdatingByConversation,
      };
    }
    case ActionTypes.CHAT_INBOX_READ: {
      let { inboxMeta } = state;
      const inboxItemsByConversationId = {
        ...state.inboxItemsByConversationId,
      };
      payload.conversationIds.forEach((conversationId) => {
        const previousItem = inboxItemsByConversationId[conversationId];
        if (!previousItem) {
          return;
        }
        const nextItem = {
          ...previousItem,
          unreadCount: 0,
          hasUnreadMention: false,
          firstUnreadMessageId: null,
        };
        inboxItemsByConversationId[conversationId] = nextItem;
        inboxMeta = updateInboxMetaForItemChange(inboxMeta, previousItem, nextItem);
      });
      return {
        ...state,
        inboxItemsByConversationId,
        inboxMeta,
        inboxError: null,
      };
    }
    case ActionTypes.CHAT_INBOX_READ__SUCCESS: {
      const inboxItemsByConversationId = {
        ...state.inboxItemsByConversationId,
      };
      let { inboxMeta } = state;
      (payload.readStates || []).forEach((readState) => {
        const conversationId = getInboxConversationId(readState);
        const previousItem = inboxItemsByConversationId[conversationId];
        if (previousItem) {
          const nextItem = {
            ...previousItem,
            ...readState,
            conversationId,
            ...(getInboxUnreadCount(readState) === 0 && {
              hasUnreadMention: false,
              firstUnreadMessageId: null,
            }),
          };
          inboxItemsByConversationId[conversationId] = nextItem;
          inboxMeta = updateInboxMetaForItemChange(inboxMeta, previousItem, nextItem);
        }
      });
      return {
        ...state,
        inboxItemsByConversationId,
        inboxMeta: payload.meta ? { ...inboxMeta, ...payload.meta } : inboxMeta,
      };
    }
    case ActionTypes.CHAT_INBOX_READ__FAILURE: {
      const inboxItemsByConversationId = {
        ...state.inboxItemsByConversationId,
      };
      let { inboxMeta } = state;
      Object.entries(payload.previousItemsByConversationId).forEach(
        ([conversationId, previousItem]) => {
          const currentItem = inboxItemsByConversationId[conversationId];
          if (!currentItem) {
            return;
          }
          const restoredItem = restoreInboxItemAfterReadFailure(currentItem, previousItem);
          inboxItemsByConversationId[conversationId] = restoredItem;
          inboxMeta = updateInboxMetaForItemChange(inboxMeta, currentItem, restoredItem);
        },
      );
      return {
        ...state,
        inboxItemsByConversationId,
        inboxMeta,
        inboxError: payload.error,
      };
    }
    case ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE: {
      const conversationIdSet = new Set(payload.conversationIds);
      const nextMessagesFetching = {
        ...state.isMessagesFetchingByConversation,
      };
      const nextHasMoreMessages = { ...state.hasMoreMessagesByConversation };
      const nextHasMoreNewerMessages = {
        ...state.hasMoreNewerMessagesByConversation,
      };
      const nextDrafts = { ...state.draftsByConversation };
      const nextReplyTargets = { ...state.replyTargetsByConversation };
      const nextTyping = { ...state.typingByConversation };
      const nextPreferencesUpdating = {
        ...state.isPreferencesUpdatingByConversation,
      };
      const nextErrors = { ...state.errorsByScope };
      const nextMembersFetching = { ...state.isMembersFetchingByProject };
      const nextConversationsFetching = {
        ...state.isConversationsFetchingByProject,
      };
      const nextFetchedConversations = {
        ...state.hasFetchedConversationsByProject,
      };
      const nextCreationErrors = { ...state.conversationCreationErrorsByKey };
      const nextCreatedConversationIds = {
        ...state.createdConversationIdByRequestKey,
      };
      let nextInboxMeta = state.inboxMeta;
      const nextInboxItems = { ...state.inboxItemsByConversationId };
      Object.values(nextInboxItems)
        .filter((item) => item.projectId === payload.projectId)
        .forEach((item) => {
          delete nextInboxItems[getInboxConversationId(item)];
          nextInboxMeta = updateInboxMetaForItemChange(nextInboxMeta, item, null);
        });
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
        inboxItemsByConversationId: nextInboxItems,
        inboxMeta: nextInboxMeta,
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
      const previousInboxItem = state.inboxItemsByConversationId[payload.conversationId];
      return {
        ...state,
        inboxItemsByConversationId: removeKey(state.inboxItemsByConversationId),
        inboxMeta: previousInboxItem
          ? updateInboxMetaForItemChange(state.inboxMeta, previousInboxItem, null)
          : state.inboxMeta,
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
    case ActionTypes.CHAT_CONVERSATION_READ: {
      const previousItem = state.inboxItemsByConversationId[payload.conversationId];
      if (!previousItem) {
        return state;
      }
      const nextItem = {
        ...previousItem,
        unreadCount: 0,
        hasUnreadMention: false,
        firstUnreadMessageId: null,
      };
      return {
        ...state,
        inboxItemsByConversationId: {
          ...state.inboxItemsByConversationId,
          [payload.conversationId]: nextItem,
        },
        inboxMeta: updateInboxMetaForItemChange(state.inboxMeta, previousItem, nextItem),
      };
    }
    case ActionTypes.CHAT_CONVERSATION_READ__SUCCESS:
    case ActionTypes.CHAT_CONVERSATION_READ_HANDLE: {
      const { readState } = payload;
      const conversationId = getInboxConversationId(readState);
      const previousItem = state.inboxItemsByConversationId[conversationId];
      if (!previousItem) {
        return state;
      }
      const nextItem = {
        ...previousItem,
        ...readState,
        conversationId,
        ...(getInboxUnreadCount(readState) === 0 && {
          hasUnreadMention: false,
          firstUnreadMessageId: null,
        }),
      };
      return {
        ...state,
        inboxItemsByConversationId: {
          ...state.inboxItemsByConversationId,
          [conversationId]: nextItem,
        },
        inboxMeta: updateInboxMetaForItemChange(state.inboxMeta, previousItem, nextItem),
      };
    }
    case ActionTypes.CHAT_CONVERSATION_READ__FAILURE: {
      const currentItem = state.inboxItemsByConversationId[payload.conversationId];
      const previousItem = payload.previousInboxItem;
      if (!currentItem || !previousItem) {
        return state;
      }
      const restoredItem = restoreInboxItemAfterReadFailure(currentItem, previousItem);
      return {
        ...state,
        inboxItemsByConversationId: {
          ...state.inboxItemsByConversationId,
          [payload.conversationId]: restoredItem,
        },
        inboxMeta: updateInboxMetaForItemChange(state.inboxMeta, currentItem, restoredItem),
      };
    }
    case ActionTypes.CHAT_CONVERSATION_CREATE: {
      const nextCreationErrors = { ...state.conversationCreationErrorsByKey };
      delete nextCreationErrors[payload.requestKey];
      const nextCreatedConversationIds = {
        ...state.createdConversationIdByRequestKey,
      };
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
      const conversationTyping = {
        ...(state.typingByConversation[conversationId] || {}),
      };
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
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE: {
      const previousItem = state.inboxItemsByConversationId[payload.conversationId];
      return {
        ...state,
        inboxItemsByConversationId: previousItem
          ? {
              ...state.inboxItemsByConversationId,
              [payload.conversationId]: { ...previousItem, ...payload.data },
            }
          : state.inboxItemsByConversationId,
        isPreferencesUpdatingByConversation: {
          ...state.isPreferencesUpdatingByConversation,
          [payload.conversationId]: true,
        },
      };
    }
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__SUCCESS: {
      const { participant } = payload;
      const previousItem = state.inboxItemsByConversationId[participant.conversationId];
      return {
        ...state,
        inboxItemsByConversationId: previousItem
          ? {
              ...state.inboxItemsByConversationId,
              [participant.conversationId]: {
                ...previousItem,
                notificationLevel: participant.notificationLevel,
                mutedUntil: participant.mutedUntil,
                isMuted: participant.isMuted,
              },
            }
          : state.inboxItemsByConversationId,
        isPreferencesUpdatingByConversation: {
          ...state.isPreferencesUpdatingByConversation,
          [participant.conversationId]: false,
        },
      };
    }
    case ActionTypes.CHAT_CONVERSATION_PREFERENCES_UPDATE__FAILURE: {
      const previousItem = state.inboxItemsByConversationId[payload.conversationId];
      return {
        ...state,
        inboxItemsByConversationId:
          previousItem && payload.previousData
            ? {
                ...state.inboxItemsByConversationId,
                [payload.conversationId]: { ...previousItem, ...payload.previousData },
              }
            : state.inboxItemsByConversationId,
        isPreferencesUpdatingByConversation: {
          ...state.isPreferencesUpdatingByConversation,
          [payload.conversationId]: false,
        },
      };
    }
    default:
      return state;
  }
};
