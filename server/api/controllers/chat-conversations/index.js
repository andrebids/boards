/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(project);
    if (!memberUserIds.includes(currentUser.id)) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const projectConversations = await ChatConversation.qm.getByProjectId(project.id);
    const projectConversationIds = sails.helpers.utils.mapRecords(projectConversations);
    const allParticipants = await ChatParticipant.qm.getByConversationIds(projectConversationIds);
    const participantsByConversationId = new Map();
    allParticipants.forEach((participant) => {
      const conversationParticipants =
        participantsByConversationId.get(participant.conversationId) || [];
      conversationParticipants.push(participant);
      participantsByConversationId.set(participant.conversationId, conversationParticipants);
    });

    const memberUserIdsSet = new Set(memberUserIds);
    const groupConversationIds = new Set();

    const conversationAccessResults = await Promise.all(
      projectConversations.map(async (conversation) => {
        const conversationParticipants = participantsByConversationId.get(conversation.id) || [];

        if (conversation.archivedAt) {
          return null;
        }

        if (conversation.type === ChatConversation.Types.PROJECT_GROUP) {
          groupConversationIds.add(conversation.id);

          if (!conversationParticipants.some(({ userId }) => userId === currentUser.id)) {
            const participant = await sails.helpers.chat.ensureParticipant(
              conversation.id,
              currentUser.id,
            );
            conversationParticipants.push(participant);
            participantsByConversationId.set(conversation.id, conversationParticipants);
          }

          return { ...conversation, isBlocked: false };
        }

        if (
          conversation.type === ChatConversation.Types.PROJECT_DIRECT &&
          conversationParticipants.length === 2 &&
          conversationParticipants.some(({ userId }) => userId === currentUser.id)
        ) {
          return {
            ...conversation,
            isBlocked: conversationParticipants.some(({ userId }) => !memberUserIdsSet.has(userId)),
          };
        }

        if (
          conversation.type === ChatConversation.Types.PROJECT_CUSTOM_GROUP &&
          conversationParticipants.some(({ userId }) => userId === currentUser.id)
        ) {
          const activeParticipants = conversationParticipants.filter(({ userId }) =>
            memberUserIdsSet.has(userId),
          );
          return activeParticipants.length >= 2 ? { ...conversation, isBlocked: false } : null;
        }

        return null;
      }),
    );
    const accessibleConversations = conversationAccessResults.filter(Boolean);

    const accessibleConversationIds = new Set(
      sails.helpers.utils.mapRecords(accessibleConversations),
    );
    const lastMessages = await ChatMessage.qm.getLastByConversationIds([
      ...accessibleConversationIds,
    ]);
    const lastMessagesByConversationId = new Map(
      lastMessages.map((message) => [message.conversationId, message]),
    );
    const conversations = accessibleConversations.map((conversation) => {
      const lastMessage = lastMessagesByConversationId.get(conversation.id);
      return {
        ...conversation,
        lastMessage: lastMessage ? sails.helpers.chat.presentMessage(lastMessage) : null,
      };
    });
    const conversationIds = sails.helpers.utils.mapRecords(conversations);
    const participants = allParticipants.filter(
      ({ conversationId, userId }) =>
        accessibleConversationIds.has(conversationId) &&
        (!groupConversationIds.has(conversationId) || memberUserIdsSet.has(userId)),
    );
    groupConversationIds.forEach((conversationId) => {
      const currentParticipant = participantsByConversationId
        .get(conversationId)
        .find(({ userId }) => userId === currentUser.id);
      if (!participants.some(({ id }) => id === currentParticipant.id)) {
        participants.push(currentParticipant);
      }
    });
    const unreadCounts = await sails.helpers.chat.getUnreadCounts(conversationIds, currentUser.id);
    const items = conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadCounts[conversation.id] || 0,
    }));

    const userIds = _.union(
      sails.helpers.utils.mapRecords(participants, 'userId', true),
      sails.helpers.utils.mapRecords(lastMessages.filter(Boolean), 'userId', true, true),
    );
    const users = await User.qm.getByIds(userIds);

    return {
      items,
      included: {
        chatParticipants: participants,
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
  },
};
