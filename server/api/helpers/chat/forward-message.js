/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const toVisibleMentions = (text) => String(text || '').replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

module.exports = {
  inputs: {
    sourceMessage: { type: 'ref', required: true },
    targetConversation: { type: 'ref', required: true },
    targetAccess: { type: 'ref', required: true },
    user: { type: 'ref', required: true },
    clientMessageId: { type: 'string' },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const sourceAttachments = await ChatMessageAttachment.qm.getByMessageIds([
      inputs.sourceMessage.id,
    ]);
    const text = toVisibleMentions(inputs.sourceMessage.text);

    const message = await sails.getDatastore().transaction(async (db) => {
      const createdMessage = await ChatMessage.create({
        conversationId: inputs.targetConversation.id,
        userId: inputs.user.id,
        text,
        clientMessageId: inputs.clientMessageId,
        forwardedFromMessageId: inputs.sourceMessage.id,
        forwardedFromUserId: inputs.sourceMessage.userId,
      })
        .fetch()
        .usingConnection(db);

      await Promise.all(
        sourceAttachments.map(async (attachment) => {
          const updateResult = await sails
            .sendNativeQuery(
              `UPDATE file_reference
               SET total = total + 1, updated_at = $1
               WHERE id = $2 AND total IS NOT NULL
               RETURNING id`,
              [new Date().toISOString(), attachment.fileReferenceId],
            )
            .usingConnection(db);
          if (updateResult.rowCount === 0) {
            throw new Error('File reference not found');
          }

          await ChatMessageAttachment.create({
            messageId: createdMessage.id,
            creatorUserId: inputs.user.id,
            fileReferenceId: attachment.fileReferenceId,
            name: attachment.name,
            data: attachment.data,
          }).usingConnection(db);
        }),
      );

      await sails
        .sendNativeQuery(
          `UPDATE chat_conversation
           SET last_message_at = GREATEST(COALESCE(last_message_at, $2), $2), updated_at = $2
           WHERE id = $1`,
          [inputs.targetConversation.id, createdMessage.createdAt],
        )
        .usingConnection(db);

      return createdMessage;
    });

    const extras = await sails.helpers.chat.getMessageExtras([message.id], inputs.user.id);
    const presentedMessage = sails.helpers.chat.presentMessage({
      ...message,
      ...extras[message.id],
    });
    const payload = {
      item: presentedMessage,
      included: { users: [sails.helpers.users.presentOne(inputs.user, {})] },
    };
    sails.sockets.broadcast(
      `chatConversation:${inputs.targetConversation.id}`,
      'chatMessageCreate',
      payload,
      inputs.request,
    );

    const uniqueRecipientUserIds = await sails.helpers.chat.getConversationRecipientUserIds(
      inputs.targetConversation,
    );
    const unreadCounts = await sails.helpers.chat.getUnreadCountsForUsers(
      inputs.targetConversation.id,
      uniqueRecipientUserIds,
    );
    uniqueRecipientUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
        item: {
          id: inputs.targetConversation.id,
          projectId: inputs.targetConversation.projectId,
          lastMessageAt: message.createdAt,
          lastMessage: presentedMessage,
          unreadCount: unreadCounts[userId] || 0,
        },
      });
    });

    return { ...message, ...extras[message.id] };
  },
};
