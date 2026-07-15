/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';
import { createSelector as createReselector } from 'reselect';

import orm from '../orm';
import { selectPath } from './router';
import { isLocalId } from '../utils/local-id';

const enrichConversation = (conversationModel) => {
  const participantModels = conversationModel.participants.toModelArray();
  const participants = participantModels.map((participantModel) => participantModel.ref);

  return {
    ...conversationModel.ref,
    participantUserIds: participants.map((participant) => participant.userId),
    participantUsers: participantModels
      .map((participantModel) => participantModel.user?.ref)
      .filter(Boolean),
    participants,
  };
};

export const selectChatState = (state) => state.chat;

export const selectChatInboxItems = createReselector(
  selectChatState,
  ({ inboxItemsByConversationId }) =>
    Object.values(inboxItemsByConversationId).sort((left, right) => {
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      return (
        rightTime - leftTime ||
        String(right.conversationId).localeCompare(String(left.conversationId))
      );
    }),
);

export const selectIsChatInboxFetching = (state) => selectChatState(state).isInboxFetching;

export const selectHasFetchedChatInbox = (state) => selectChatState(state).hasFetchedInbox;

export const selectChatInboxError = (state) => selectChatState(state).inboxError;

export const selectChatInboxUnreadConversationTotal = createReselector(
  selectChatState,
  ({ inboxItemsByConversationId, inboxMeta }) =>
    typeof inboxMeta.unreadConversationTotal === 'number'
      ? inboxMeta.unreadConversationTotal
      : Object.values(inboxItemsByConversationId).filter((item) => (item.unreadCount || 0) > 0)
          .length,
);

export const selectChatInboxUnreadMessageTotal = createReselector(
  selectChatState,
  ({ inboxItemsByConversationId, inboxMeta }) =>
    typeof inboxMeta.unreadMessageTotal === 'number'
      ? inboxMeta.unreadMessageTotal
      : Object.values(inboxItemsByConversationId).reduce(
          (total, item) => total + (item.unreadCount || 0),
          0,
        ),
);

export const selectChatInboxUnreadConversationTotalsByProjectId = createReselector(
  selectChatState,
  ({ inboxItemsByConversationId, inboxMeta }) => {
    if (inboxMeta.unreadConversationTotalsByProjectId) {
      return inboxMeta.unreadConversationTotalsByProjectId;
    }
    return Object.values(inboxItemsByConversationId).reduce((totals, item) => {
      if (!item.projectId || !(item.unreadCount > 0)) {
        return totals;
      }
      return {
        ...totals,
        [item.projectId]: (totals[item.projectId] || 0) + 1,
      };
    }, {});
  },
);

export const selectChatInboxUnreadTotalsByProjectId =
  selectChatInboxUnreadConversationTotalsByProjectId;

export const selectIsChatAvailableForCurrentUser = createReselector(
  selectChatState,
  ({ inboxItemsByConversationId, inboxMeta }) =>
    typeof inboxMeta.hasChatAccess === 'boolean'
      ? inboxMeta.hasChatAccess
      : Object.keys(inboxItemsByConversationId).length > 0,
);

export const selectOpenChatConversationIds = (state) => selectChatState(state).openConversationIds;

export const selectMinimizedChatConversationIds = (state) =>
  selectChatState(state).minimizedConversationIds;

export const selectChatConversationCreationErrors = (state) =>
  selectChatState(state).conversationCreationErrorsByKey;

export const selectChatAccessRevocationVersions = (state) =>
  selectChatState(state).accessRevocationVersionByProject;

export const selectLastChatMessageAlert = (state) => selectChatState(state).lastMessageAlert;

export const makeSelectChatDraftByConversationId = () => (state, conversationId) =>
  selectChatState(state).draftsByConversation[conversationId] || '';

export const makeSelectChatReplyTargetByConversationId = () => (state, conversationId) =>
  selectChatState(state).replyTargetsByConversation[conversationId] || null;

export const makeSelectChatTypingUserIdsByConversationId = () => (state, conversationId) =>
  Object.keys(selectChatState(state).typingByConversation[conversationId] || {});

export const selectHasFetchedChatConversationsForCurrentProject = (state) => {
  const { projectId } = selectPath(state);
  return Boolean(selectChatState(state).hasFetchedConversationsByProject[projectId]);
};

export const selectChatConversationIdsByProjectId = createSelector(
  orm,
  (_, projectId) => projectId,
  ({ ChatConversation }, projectId) =>
    ChatConversation.filter({ projectId })
      .toRefArray()
      .map(({ id }) => id),
);

export const selectChatMembersForCurrentProject = createSelector(
  orm,
  (state) => selectPath(state).projectId,
  (state) => selectChatState(state).memberIdsByProject,
  ({ User }, projectId, memberIdsByProject) =>
    (memberIdsByProject[projectId] || [])
      .map((id) => User.withId(id))
      .filter(Boolean)
      .map((userModel) => userModel.ref),
);

export const selectChatConversationsForCurrentProject = createSelector(
  orm,
  (state) => selectPath(state).projectId,
  ({ ChatConversation }, projectId) => {
    if (!projectId) {
      return [];
    }

    return ChatConversation.filter({ projectId })
      .toModelArray()
      .map(enrichConversation)
      .sort((left, right) => {
        const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
        const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
        return rightTime - leftTime;
      });
  },
);

export const makeSelectChatConversationById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ ChatConversation }, id) => {
      const conversationModel = ChatConversation.withId(id);
      return conversationModel ? enrichConversation(conversationModel) : conversationModel;
    },
  );

export const selectChatConversationById = makeSelectChatConversationById();

export const makeSelectChatMessageById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ ChatMessage }, id) => {
      const messageModel = ChatMessage.withId(id);
      return messageModel ? messageModel.ref : messageModel;
    },
  );

export const selectChatMessageById = makeSelectChatMessageById();

export const makeSelectChatMessagesByConversationId = () =>
  createSelector(
    orm,
    (_, conversationId) => conversationId,
    ({ ChatMessage }, conversationId) =>
      ChatMessage.filter({ conversationId })
        .toRefArray()
        .map((message) => ({
          ...message,
          isPersisted: !isLocalId(message.id),
        }))
        .sort((left, right) => {
          const createdAtDifference =
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
          return createdAtDifference || String(left.id).localeCompare(String(right.id));
        }),
  );

export const selectChatMessagesByConversationId = makeSelectChatMessagesByConversationId();

export const selectHasPendingChatMessages = createSelector(
  orm,
  ({ ChatMessage }) => ChatMessage.filter({ isPending: true }).count() > 0,
);

export const selectChatUnreadTotal = createSelector(
  orm,
  (state) => selectPath(state).projectId,
  ({ ChatConversation }, projectId) =>
    projectId
      ? ChatConversation.filter({ projectId })
          .toRefArray()
          .reduce((total, conversation) => total + (conversation.unreadCount || 0), 0)
      : 0,
);

export const makeSelectIsChatMessagesFetchingByConversationId = () => (state, conversationId) =>
  Boolean(selectChatState(state).isMessagesFetchingByConversation[conversationId]);

export const makeSelectHasMoreChatMessagesByConversationId = () => (state, conversationId) =>
  selectChatState(state).hasMoreMessagesByConversation[conversationId] !== false;

export const makeSelectHasMoreNewerChatMessagesByConversationId = () => (state, conversationId) =>
  Boolean(selectChatState(state).hasMoreNewerMessagesByConversation[conversationId]);

export default {
  selectChatState,
  selectChatInboxItems,
  selectIsChatInboxFetching,
  selectHasFetchedChatInbox,
  selectChatInboxError,
  selectChatInboxUnreadConversationTotal,
  selectChatInboxUnreadMessageTotal,
  selectChatInboxUnreadConversationTotalsByProjectId,
  selectChatInboxUnreadTotalsByProjectId,
  selectIsChatAvailableForCurrentUser,
  selectOpenChatConversationIds,
  selectMinimizedChatConversationIds,
  selectChatConversationCreationErrors,
  selectChatAccessRevocationVersions,
  selectLastChatMessageAlert,
  makeSelectChatDraftByConversationId,
  makeSelectChatReplyTargetByConversationId,
  makeSelectChatTypingUserIdsByConversationId,
  selectHasFetchedChatConversationsForCurrentProject,
  selectChatConversationIdsByProjectId,
  selectChatMembersForCurrentProject,
  selectChatConversationsForCurrentProject,
  makeSelectChatConversationById,
  selectChatConversationById,
  makeSelectChatMessageById,
  selectChatMessageById,
  makeSelectChatMessagesByConversationId,
  selectChatMessagesByConversationId,
  selectHasPendingChatMessages,
  selectChatUnreadTotal,
  makeSelectIsChatMessagesFetchingByConversationId,
  makeSelectHasMoreChatMessagesByConversationId,
  makeSelectHasMoreNewerChatMessagesByConversationId,
};
