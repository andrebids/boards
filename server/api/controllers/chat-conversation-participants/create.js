/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  INVALID_USERS: { invalidUsers: 'Invalid users' },
};

module.exports = {
  inputs: {
    conversationId: { ...idInput, required: true },
    userIds: { type: 'json', required: true },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
    invalidUsers: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const conversation = await ChatConversation.qm.getOneById(inputs.conversationId);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (!access || conversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }
    if (access.participant.role !== ChatParticipant.Roles.OWNER) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const userIds = Array.isArray(inputs.userIds) ? [...new Set(inputs.userIds)] : [];
    if (
      userIds.length === 0 ||
      userIds.some((userId) => typeof userId !== 'string' || !access.memberUserIds.includes(userId))
    ) {
      throw Errors.INVALID_USERS;
    }
    const users = await User.qm.getByIds(userIds);
    if (users.length !== userIds.length) {
      throw Errors.INVALID_USERS;
    }

    const newParticipants = await Promise.all(
      userIds
        .filter(
          (userId) => !access.participants.some((participant) => participant.userId === userId),
        )
        .map((userId) => sails.helpers.chat.ensureParticipant(conversation.id, userId)),
    );
    const participants = [...access.participants, ...newParticipants];

    const payload = {
      item: conversation,
      included: {
        chatParticipants: participants,
        users: sails.helpers.users.presentMany(users, this.req.currentUser),
      },
    };
    participants.forEach(({ userId }) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', payload);
    });
    return payload;
  },
};
