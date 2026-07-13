/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
};

module.exports = {
  inputs: { messageId: { ...idInput, required: true } },
  exits: { messageNotFound: { responseType: 'notFound' } },

  async fn(inputs) {
    const message = await ChatMessage.qm.getOneById(inputs.messageId);
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (!message || message.deletedAt || !access) {
      throw Errors.MESSAGE_NOT_FOUND;
    }

    let savedMessage = await ChatSavedMessage.qm.getOneByUserIdAndMessageId(
      this.req.currentUser.id,
      message.id,
    );
    if (!savedMessage) {
      try {
        savedMessage = await ChatSavedMessage.qm.createOne({
          userId: this.req.currentUser.id,
          messageId: message.id,
        });
      } catch (error) {
        if (error.code !== 'E_UNIQUE') {
          throw error;
        }
        savedMessage = await ChatSavedMessage.qm.getOneByUserIdAndMessageId(
          this.req.currentUser.id,
          message.id,
        );
      }
    }

    const extras = await sails.helpers.chat.getMessageExtras([message.id], this.req.currentUser.id);
    return {
      item: sails.helpers.chat.presentMessage({ ...message, ...extras[message.id] }),
      savedMessage,
    };
  },
};
