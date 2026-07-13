/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const lastEvents = new Map();
const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  SOCKET_REQUIRED: { socketRequired: 'Socket required' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    isTyping: { type: 'boolean', required: true },
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
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (!access || !access.canWrite) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const key = `${inputs.id}:${this.req.currentUser.id}`;
    const now = Date.now();
    if (inputs.isTyping && now - (lastEvents.get(key) || 0) < 1500) {
      return {};
    }
    if (inputs.isTyping) {
      lastEvents.set(key, now);
    } else {
      lastEvents.delete(key);
    }

    sails.sockets.broadcast(
      `chatConversation:${inputs.id}`,
      'chatTypingUpdate',
      {
        item: {
          conversationId: inputs.id,
          userId: this.req.currentUser.id,
          isTyping: inputs.isTyping,
        },
      },
      this.req,
    );
    return {};
  },
};
