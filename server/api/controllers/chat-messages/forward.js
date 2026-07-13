/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  TARGET_NOT_FOUND: { targetNotFound: 'Target conversation not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    targetConversationId: { ...idInput, required: true },
    clientMessageId: { type: 'string', minLength: 1, maxLength: 128 },
  },
  exits: {
    messageNotFound: { responseType: 'notFound' },
    targetNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const sourceMessage = await ChatMessage.qm.getOneById(inputs.id);
    const sourceConversation =
      sourceMessage && (await ChatConversation.qm.getOneById(sourceMessage.conversationId));
    const sourceAccess =
      sourceConversation &&
      (await sails.helpers.chat.getConversationAccess(sourceConversation, this.req.currentUser));
    if (!sourceMessage || sourceMessage.deletedAt || !sourceAccess) {
      throw Errors.MESSAGE_NOT_FOUND;
    }

    const targetConversation = await ChatConversation.qm.getOneById(inputs.targetConversationId);
    const targetAccess =
      targetConversation &&
      (await sails.helpers.chat.getConversationAccess(targetConversation, this.req.currentUser));
    if (
      !targetAccess ||
      !targetAccess.canWrite ||
      targetConversation.projectId !== sourceConversation.projectId
    ) {
      throw Errors.TARGET_NOT_FOUND;
    }

    const item = await sails.helpers.chat.forwardMessage.with({
      sourceMessage,
      targetConversation,
      targetAccess,
      user: this.req.currentUser,
      clientMessageId: inputs.clientMessageId,
      request: this.req,
    });
    return { item: sails.helpers.chat.presentMessage(item) };
  },
};
