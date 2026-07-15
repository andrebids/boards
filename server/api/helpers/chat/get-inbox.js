/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const encodeCursor = (item) =>
  Buffer.from(
    JSON.stringify({
      lastMessageAt: item.lastMessageAt || null,
      conversationId: item.conversationId,
    }),
  ).toString('base64url');

const decodeCursor = (cursor) => {
  if (!cursor) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      !value ||
      (value.lastMessageAt !== null && typeof value.lastMessageAt !== 'string') ||
      typeof value.conversationId !== 'string'
    ) {
      return null;
    }
    return value;
  } catch (error) {
    return null;
  }
};

const compareIdsDescending = (leftId, rightId) => {
  try {
    if (BigInt(leftId) === BigInt(rightId)) {
      return 0;
    }
    return BigInt(leftId) > BigInt(rightId) ? -1 : 1;
  } catch (error) {
    return String(rightId).localeCompare(String(leftId));
  }
};

const compareInboxItems = (left, right) => {
  const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
  const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
  return rightTime - leftTime || compareIdsDescending(left.conversationId, right.conversationId);
};

const isAfterCursor = (item, cursor) =>
  compareInboxItems(item, {
    conversationId: cursor.conversationId,
    lastMessageAt: cursor.lastMessageAt,
  }) > 0;

const getCandidateProjects = async (user) => {
  const managerProjectIds = await sails.helpers.users.getManagerProjectIds(user.id);
  const fullyVisibleProjectIds = [...managerProjectIds];
  let sharedProjects = [];

  if (user.role === User.Roles.ADMIN) {
    sharedProjects = await Project.qm.getShared({ exceptIdOrIds: managerProjectIds });
    fullyVisibleProjectIds.push(...sails.helpers.utils.mapRecords(sharedProjects));
  }

  const boardMemberships = await BoardMembership.qm.getByUserId(user.id);
  const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');
  const membershipBoards = await Board.qm.getByIds(membershipBoardIds, {
    exceptProjectIdOrIds: fullyVisibleProjectIds,
  });
  const membershipProjectIds = sails.helpers.utils.mapRecords(membershipBoards, 'projectId', true);
  const projectIds = _.union(managerProjectIds, membershipProjectIds);
  const projects = await Project.qm.getByIds(projectIds);

  return [...projects, ...sharedProjects];
};

module.exports = {
  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
    filter: {
      type: 'string',
      isIn: ['unread', 'mentions', 'all'],
      defaultsTo: 'all',
    },
    before: {
      type: 'string',
    },
    limit: {
      type: 'number',
      min: 1,
      max: 100,
      defaultsTo: 50,
    },
  },

  async fn(inputs) {
    const candidateProjects = await getCandidateProjects(inputs.user);
    const projectAccessResults = await Promise.all(
      candidateProjects.map(async (project) => {
        const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(project);
        return memberUserIds.includes(inputs.user.id) ? { project, memberUserIds } : null;
      }),
    );
    const projectAccesses = projectAccessResults.filter(Boolean);
    const hasChatAccess = projectAccesses.length > 0;

    if (!hasChatAccess) {
      return {
        items: [],
        included: { users: [] },
        meta: {
          hasChatAccess: false,
          unreadConversationTotal: 0,
          unreadMessageTotal: 0,
          unreadConversationTotalsByProjectId: {},
          hasMore: false,
          nextCursor: null,
        },
      };
    }

    const projectIds = projectAccesses.map(({ project }) => project.id);
    const projectAccessById = new Map(projectAccesses.map((access) => [access.project.id, access]));
    const projectConversations = await ChatConversation.qm.getByProjectIds(projectIds);
    const projectConversationIds = sails.helpers.utils.mapRecords(projectConversations);
    const allParticipants = await ChatParticipant.qm.getByConversationIds(projectConversationIds);
    const participantsByConversationId = new Map();
    allParticipants.forEach((participant) => {
      const participants = participantsByConversationId.get(participant.conversationId) || [];
      participants.push(participant);
      participantsByConversationId.set(participant.conversationId, participants);
    });

    const accessibleConversations = projectConversations.filter((conversation) => {
      if (conversation.archivedAt) {
        return false;
      }

      const access = projectAccessById.get(conversation.projectId);
      if (!access) {
        return false;
      }

      const participants = participantsByConversationId.get(conversation.id) || [];
      if (conversation.type === ChatConversation.Types.PROJECT_GROUP) {
        return true;
      }
      if (conversation.type === ChatConversation.Types.PROJECT_DIRECT) {
        return (
          participants.length === 2 && participants.some(({ userId }) => userId === inputs.user.id)
        );
      }
      if (conversation.type === ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
        return (
          participants.some(({ userId }) => userId === inputs.user.id) &&
          participants.filter(({ userId }) => access.memberUserIds.includes(userId)).length >= 2
        );
      }
      return false;
    });

    const conversationIds = sails.helpers.utils.mapRecords(accessibleConversations);
    const [lastMessages, unreadDetailsByConversationId] = await Promise.all([
      ChatMessage.qm.getLastByConversationIds(conversationIds),
      sails.helpers.chat.getUnreadDetails(conversationIds, inputs.user.id),
    ]);
    const lastMessagesByConversationId = new Map(
      lastMessages.map((message) => [message.conversationId, message]),
    );
    const relevantUserIds = _.union(
      sails.helpers.utils.mapRecords(allParticipants, 'userId', true),
      sails.helpers.utils.mapRecords(lastMessages, 'userId', true, true),
    );
    const users = await User.qm.getByIds(relevantUserIds);
    const userById = new Map(users.map((user) => [user.id, user]));

    const allItems = accessibleConversations
      .map((conversation) => {
        const { project } = projectAccessById.get(conversation.projectId);
        const participants = participantsByConversationId.get(conversation.id) || [];
        const currentParticipant = participants.find(({ userId }) => userId === inputs.user.id);
        const avatarUser =
          conversation.type === ChatConversation.Types.PROJECT_DIRECT
            ? participants.find(({ userId }) => userId !== inputs.user.id)
            : null;
        const avatarUserId = avatarUser ? avatarUser.userId : null;
        const lastMessage = lastMessagesByConversationId.get(conversation.id);
        const unreadDetails = unreadDetailsByConversationId[conversation.id] || {
          unreadCount: 0,
          firstUnreadMessageId: null,
          hasUnreadMention: false,
        };

        return {
          conversationId: conversation.id,
          projectId: project.id,
          projectName: project.name,
          type: conversation.type,
          title:
            conversation.title ||
            (avatarUserId && userById.get(avatarUserId) && userById.get(avatarUserId).name) ||
            null,
          avatarUserId,
          lastMessageAt:
            conversation.lastMessageAt || (lastMessage && lastMessage.createdAt) || null,
          lastMessage: lastMessage ? sails.helpers.chat.presentMessage(lastMessage) : null,
          firstUnreadMessageId: unreadDetails.firstUnreadMessageId,
          unreadCount: unreadDetails.unreadCount,
          hasUnreadMention: unreadDetails.hasUnreadMention,
          notificationLevel: currentParticipant
            ? currentParticipant.notificationLevel
            : ChatParticipant.NotificationLevels.ALL,
          mutedUntil: currentParticipant ? currentParticipant.mutedUntil : null,
          isMuted: currentParticipant ? ChatParticipant.isMuted(currentParticipant) : false,
        };
      })
      .sort(compareInboxItems);

    const unreadItems = allItems.filter(({ unreadCount }) => unreadCount > 0);
    const unreadConversationTotalsByProjectId = unreadItems.reduce(
      (totals, item) => ({
        ...totals,
        [item.projectId]: (totals[item.projectId] || 0) + 1,
      }),
      {},
    );
    const meta = {
      hasChatAccess,
      unreadConversationTotal: unreadItems.length,
      unreadMessageTotal: unreadItems.reduce((total, item) => total + item.unreadCount, 0),
      unreadConversationTotalsByProjectId,
    };

    let filteredItems = allItems;
    if (inputs.filter === 'unread') {
      filteredItems = unreadItems;
    } else if (inputs.filter === 'mentions') {
      filteredItems = unreadItems.filter(({ hasUnreadMention }) => hasUnreadMention);
    }

    const cursor = decodeCursor(inputs.before);
    if (inputs.before && !cursor) {
      return {
        items: [],
        included: { users: [] },
        meta: { ...meta, hasMore: false, nextCursor: null },
      };
    }
    if (cursor) {
      filteredItems = filteredItems.filter((item) => isAfterCursor(item, cursor));
    }

    const hasMore = filteredItems.length > inputs.limit;
    const items = filteredItems.slice(0, inputs.limit);
    const nextCursor = hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]) : null;
    const includedUserIds = new Set(
      items
        .flatMap((item) => [item.avatarUserId, item.lastMessage && item.lastMessage.userId])
        .filter(Boolean),
    );

    return {
      items,
      included: {
        users: sails.helpers.users.presentMany(
          users.filter(({ id }) => includedUserIds.has(id)),
          inputs.user,
        ),
      },
      meta: { ...meta, hasMore, nextCursor },
    };
  },
};
