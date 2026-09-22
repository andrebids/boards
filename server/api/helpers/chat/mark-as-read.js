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
    skipLatestMessage: {
      type: 'boolean',
      defaultsTo: false,
    },
    participant: {
      type: 'ref',
    },
  },

  exits: {
    messageNotFound: {},
  },

  async fn(inputs) {
    let participant =
      inputs.participant ||
      (await sails.helpers.chat.ensureParticipant(inputs.conversation.id, inputs.user.id));
    let message;
    if (inputs.messageId) {
      message = await ChatMessage.qm.getOneById(inputs.messageId);
      if (
        !message ||
        message.conversationId !== inputs.conversation.id ||
        !sails.helpers.chat.isMessageVisible(message, participant)
      ) {
        throw 'messageNotFound';
      }
    } else if (!inputs.skipLatestMessage) {
      if (participant.leftAt && participant.historyVisibleThroughMessageId) {
        const messages = await ChatMessage.qm.getByConversationId(inputs.conversation.id, {
          minimumId: participant.historyClearedThroughMessageId,
          maximumId: participant.historyVisibleThroughMessageId,
          editedBefore: participant.leftAt,
          limit: 1,
        });
        message = messages.find((candidate) =>
          sails.helpers.chat.isMessageVisible(candidate, participant),
        );
      } else if (!participant.leftAt) {
        message = await ChatMessage.qm.getLastByConversationId(inputs.conversation.id);
      }
    }

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
      ...(inputs.conversation.projectId && { projectId: inputs.conversation.projectId }),
      userId: inputs.user.id,
      lastReadMessageId: participant.lastReadMessageId,
      lastReadAt: participant.lastReadAt,
      unreadCount: unreadCounts[inputs.conversation.id] || 0,
    };

    if (!participant.leftAt)
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
