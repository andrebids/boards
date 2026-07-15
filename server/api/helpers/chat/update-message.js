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
    text: {
      type: 'string',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let message = await ChatMessage.qm.updateOneIfNotDeleted(inputs.message.id, {
      text: inputs.text,
      editedAt: new Date().toISOString(),
    });

    if (message) {
      await sails.helpers.chatLinkPreviews.syncMessageLinks.with({
        message,
        projectId: inputs.conversation.projectId,
      });
      const extras = await sails.helpers.chat.getMessageExtras([message.id]);
      message = { ...message, ...extras[message.id] };

      sails.sockets.broadcast(
        `chatConversation:${message.conversationId}`,
        'chatMessageUpdate',
        { item: sails.helpers.chat.presentMessage(message) },
        inputs.request,
      );

      const lastMessage = await ChatMessage.qm.getLastByConversationId(inputs.conversation.id);
      if (lastMessage && lastMessage.id === message.id) {
        const recipientUserIds = await sails.helpers.chat.getConversationRecipientUserIds(
          inputs.conversation,
        );
        recipientUserIds.forEach((userId) => {
          sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
            item: {
              id: inputs.conversation.id,
              projectId: inputs.conversation.projectId,
              lastMessage: sails.helpers.chat.presentMessage(message),
            },
          });
        });
      }
    }

    return message;
  },
};
