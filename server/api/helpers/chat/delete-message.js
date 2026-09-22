/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const {
  withConversationLock,
  assertConversationWritable,
} = require('../../../utils/chat-lifecycle');

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
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    let wasDeletedNow = true;
    let message = await sails.getDatastore().transaction(async (db) => {
      await sails
        .sendNativeQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `chat-conversation:${inputs.conversation.id}`,
        ])
        .usingConnection(db);
      await assertConversationWritable(inputs.conversation.id, inputs.userId, db);
      return ChatMessage.updateOne({ id: inputs.message.id, deletedAt: null })
        .set({ deletedAt: new Date().toISOString() })
        .fetch()
        .usingConnection(db);
    });

    return withConversationLock(inputs.conversation.id, async () => {
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
    });
  },
};
