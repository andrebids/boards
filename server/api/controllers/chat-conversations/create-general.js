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

    const { conversation, participants } = await sails.helpers.chat.getOrCreateProjectConversation(
      project,
      currentUser,
    );
    const item = { ...conversation, unreadCount: 0 };
    const payload = {
      item,
      included: {
        chatParticipants: participants,
        users: [sails.helpers.users.presentOne(currentUser, currentUser)],
      },
    };

    const broadcastPayload = {
      ...payload,
      included: {
        ...payload.included,
        users: [sails.helpers.users.presentOne(currentUser, {})],
      },
    };

    memberUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `@user:${userId}`,
        'chatConversationCreate',
        broadcastPayload,
        this.req,
      );
    });

    return payload;
  },
};
