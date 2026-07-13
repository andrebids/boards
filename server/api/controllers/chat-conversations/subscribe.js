/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  SOCKET_REQUIRED: { socketRequired: 'A socket request is required' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
    socketRequired: { responseType: 'badRequest' },
  },

  async fn(inputs) {
    if (!this.req.isSocket) {
      throw Errors.SOCKET_REQUIRED;
    }

    const conversation = await ChatConversation.qm.getOneById(inputs.id);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess.with({
        conversation,
        user: this.req.currentUser,
        ensureParticipant: true,
      }));

    if (!access) {
      sails.sockets.leave(this.req, `chatConversation:${inputs.id}`);
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    sails.sockets.join(this.req, `chatConversation:${conversation.id}`);
    return { item: conversation };
  },
};
