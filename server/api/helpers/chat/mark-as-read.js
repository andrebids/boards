/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    conversation: {
      type: 'ref',
      required: true,
    },
    user: {
      type: 'ref',
      required: true,
    },
    messageId: {
      type: 'string',
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    messageNotFound: {},
  },

  async fn(inputs) {
    let message;
    if (inputs.messageId) {
      message = await ChatMessage.qm.getOneById(inputs.messageId);
      if (!message || message.conversationId !== inputs.conversation.id) {
        throw 'messageNotFound';
      }
    } else {
      message = await ChatMessage.qm.getLastByConversationId(inputs.conversation.id);
    }

    let participant = await sails.helpers.chat.ensureParticipant(
      inputs.conversation.id,
      inputs.user.id,
    );

    if (message) {
      participant = await ChatParticipant.qm.advanceReadCursor(
        participant.id,
        message.id,
        new Date().toISOString(),
      );
    }

    const unreadCounts = await sails.helpers.chat.getUnreadCounts(
      [inputs.conversation.id],
      inputs.user.id,
    );

    const item = {
      conversationId: inputs.conversation.id,
      userId: inputs.user.id,
      lastReadMessageId: participant.lastReadMessageId,
      lastReadAt: participant.lastReadAt,
      unreadCount: unreadCounts[inputs.conversation.id] || 0,
    };

    sails.sockets.broadcast(
      `chatConversation:${inputs.conversation.id}`,
      'chatConversationRead',
      { item },
      inputs.request,
    );
    sails.sockets.broadcast(`@user:${inputs.user.id}`, 'chatConversationRead', { item });

    return item;
  },
};
