/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
  USER_NOT_FOUND: { userNotFound: 'User not found' },
  CANNOT_CHAT_WITH_SELF: { cannotChatWithSelf: 'Cannot create a direct chat with yourself' },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    userId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
    userNotFound: { responseType: 'notFound' },
    cannotChatWithSelf: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    if (inputs.userId === currentUser.id) {
      throw Errors.CANNOT_CHAT_WITH_SELF;
    }

    const project = await Project.qm.getOneById(inputs.projectId);
    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(project);
    if (!memberUserIds.includes(currentUser.id)) {
      throw Errors.PROJECT_NOT_FOUND;
    }
    if (!memberUserIds.includes(inputs.userId)) {
      throw Errors.USER_NOT_FOUND;
    }

    const otherUser = await User.qm.getOneById(inputs.userId, { withDeactivated: false });
    if (!otherUser) {
      throw Errors.USER_NOT_FOUND;
    }

    const { conversation, participants } = await sails.helpers.chat.getOrCreateDirectConversation(
      project,
      currentUser,
      otherUser,
    );
    const users = [currentUser, otherUser];
    const payload = {
      item: { ...conversation, unreadCount: 0 },
      included: {
        chatParticipants: participants,
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };

    users.forEach((user) => {
      sails.sockets.broadcast(
        `@user:${user.id}`,
        'chatConversationCreate',
        {
          ...payload,
          included: {
            ...payload.included,
            users: sails.helpers.users.presentMany(users, user),
          },
        },
        this.req,
      );
    });

    return payload;
  },
};
