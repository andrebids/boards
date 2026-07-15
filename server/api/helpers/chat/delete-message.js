/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    message: {
      type: 'ref',
      required: true,
    },
    conversation: {
      type: 'ref',
      required: true,
    },
    recipientUserIds: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let wasDeletedNow = true;
    let message = await ChatMessage.qm.updateOneIfNotDeleted(inputs.message.id, {
      deletedAt: new Date().toISOString(),
    });

    if (!message) {
      message = await ChatMessage.qm.getOneById(inputs.message.id);
      if (!message || !message.deletedAt) {
        return null;
      }

      wasDeletedNow = false;
    }

    const { fileReferences } = await ChatMessageAttachment.qm.deleteByMessageId(message.id);
    sails.helpers.attachments.removeUnreferencedFiles(fileReferences);

    if (!wasDeletedNow) {
      return message;
    }

    sails.sockets.broadcast(
      `chatConversation:${message.conversationId}`,
      'chatMessageDelete',
      { item: sails.helpers.chat.presentMessage(message) },
      inputs.request,
    );

    const lastMessage = await ChatMessage.qm.getLastByConversationId(inputs.conversation.id);
    const lastMessageValues =
      lastMessage && lastMessage.id === message.id
        ? { lastMessage: sails.helpers.chat.presentMessage(message) }
        : {};

    const uniqueRecipientUserIds = await sails.helpers.chat.getConversationRecipientUserIds(
      inputs.conversation,
    );
    const unreadCounts = await sails.helpers.chat.getUnreadCountsForUsers(
      inputs.conversation.id,
      uniqueRecipientUserIds,
    );

    uniqueRecipientUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
        item: {
          id: inputs.conversation.id,
          projectId: inputs.conversation.projectId,
          ...lastMessageValues,
          unreadCount: unreadCounts[userId] || 0,
        },
      });
    });

    return message;
  },
};
