/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

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

export const selectOpenChatConversationIds = (state) => selectChatState(state).openConversationIds;

export const selectMinimizedChatConversationIds = (state) =>
  selectChatState(state).minimizedConversationIds;

export const selectChatConversationCreationErrors = (state) =>
  selectChatState(state).conversationCreationErrorsByKey;

export const selectChatAccessRevocationVersions = (state) =>
  selectChatState(state).accessRevocationVersionByProject;

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

export const selectSavedChatMessagesForCurrentProject = createSelector(
  orm,
  (state) => selectPath(state).projectId,
  ({ ChatMessage, ChatConversation }, projectId) => {
    const conversationIds = new Set(
      ChatConversation.filter({ projectId })
        .toRefArray()
        .map(({ id }) => id),
    );
    return ChatMessage.filter({ isSaved: true })
      .toRefArray()
      .filter(({ conversationId }) => conversationIds.has(conversationId))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  },
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

export default {
  selectChatState,
  selectOpenChatConversationIds,
  selectMinimizedChatConversationIds,
  selectChatConversationCreationErrors,
  selectChatAccessRevocationVersions,
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
  selectSavedChatMessagesForCurrentProject,
  selectChatUnreadTotal,
  makeSelectIsChatMessagesFetchingByConversationId,
  makeSelectHasMoreChatMessagesByConversationId,
};
