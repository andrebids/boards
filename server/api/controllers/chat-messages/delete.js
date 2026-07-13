/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    messageNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const message = await ChatMessage.qm.getOneById(inputs.id);
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation && (await sails.helpers.chat.getConversationAccess(conversation, currentUser));
    if (!message || !access) {
      throw Errors.MESSAGE_NOT_FOUND;
    }
    if (message.userId !== currentUser.id) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (message.deletedAt) {
      return { item: sails.helpers.chat.presentMessage(message) };
    }

    const deletedMessage = await sails.helpers.chat.deleteMessage.with({
      message,
      conversation,
      recipientUserIds:
        conversation.type === ChatConversation.Types.PROJECT_GROUP
          ? access.memberUserIds
          : sails.helpers.utils.mapRecords(access.participants, 'userId', true),
      request: this.req,
    });
    if (!deletedMessage) {
      throw Errors.MESSAGE_NOT_FOUND;
    }

    return { item: sails.helpers.chat.presentMessage(deletedMessage) };
  },
};
