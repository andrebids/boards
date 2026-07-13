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
    if (!message || !access) {
      throw Errors.MESSAGE_NOT_FOUND;
    }

    await ChatSavedMessage.qm.deleteOne({
      userId: this.req.currentUser.id,
      messageId: message.id,
    });
    const extras = await sails.helpers.chat.getMessageExtras([message.id], this.req.currentUser.id);
    return { item: sails.helpers.chat.presentMessage({ ...message, ...extras[message.id] }) };
  },
};
