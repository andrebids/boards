/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
  INVALID_GROUP: { invalidGroup: 'Invalid group' },
};

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    title: { type: 'string', required: true, maxLength: 80 },
    userIds: { type: 'json', required: true },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
    invalidGroup: { responseType: 'unprocessableEntity' },
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

    const title = inputs.title.trim();
    const userIds = Array.isArray(inputs.userIds)
      ? [...new Set([currentUser.id, ...inputs.userIds])]
      : [];
    if (
      !title ||
      userIds.length < 2 ||
      userIds.some((userId) => typeof userId !== 'string' || !memberUserIds.includes(userId))
    ) {
      throw Errors.INVALID_GROUP;
    }

    const users = await User.qm.getByIds(userIds);
    if (users.length !== userIds.length) {
      throw Errors.INVALID_GROUP;
    }

    const { conversation, participants } = await sails.helpers.chat.createCustomGroup.with({
      project,
      user: currentUser,
      title,
      participantUserIds: userIds,
    });

    const item = { ...conversation, unreadCount: 0, lastMessage: null };
    userIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationCreate', {
        item,
        included: {
          chatParticipants: participants,
          users: sails.helpers.users.presentMany(
            users,
            users.find(({ id }) => id === userId) || currentUser,
          ),
        },
      });
    });

    return {
      item,
      included: {
        chatParticipants: participants,
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
  },
};
