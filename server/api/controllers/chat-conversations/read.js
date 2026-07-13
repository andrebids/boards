/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    messageId: idInput,
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
    messageNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const conversation = await ChatConversation.qm.getOneById(inputs.id);
    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const access = await sails.helpers.chat.getConversationAccess.with({
      conversation,
      user: currentUser,
      ensureParticipant: true,
    });
    if (!access) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const readState = await sails.helpers.chat.markAsRead
      .with({
        conversation,
        user: currentUser,
        messageId: inputs.messageId,
        request: this.req,
      })
      .intercept('messageNotFound', () => Errors.MESSAGE_NOT_FOUND);

    return { item: readState };
  },
};
