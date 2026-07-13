/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    conversationId: { ...idInput, required: true },
    userId: { ...idInput, required: true },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
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

    const target = access.participants.find(({ userId }) => userId === inputs.userId);
    if (!target) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }
    if (target.role === ChatParticipant.Roles.OWNER) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    await ChatParticipant.qm.deleteOne(target.id);
    sails.sockets.removeRoomMembersFromRooms(
      `@user:${target.userId}`,
      `chatConversation:${conversation.id}`,
    );
    sails.sockets.broadcast(`@user:${target.userId}`, 'chatConversationAccessRevoke', {
      item: { conversationId: conversation.id, projectId: conversation.projectId },
    });

    const participants = access.participants.filter(({ id }) => id !== target.id);
    participants.forEach(({ userId }) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
        item: conversation,
        included: { chatParticipants: participants },
      });
    });
    return { item: target };
  },
};
