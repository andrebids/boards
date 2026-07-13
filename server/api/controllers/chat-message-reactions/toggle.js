/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  MESSAGE_DELETED: { messageDeleted: 'Message deleted' },
  CONVERSATION_BLOCKED: { conversationBlocked: 'Conversation is blocked' },
};

module.exports = {
  inputs: {
    messageId: {
      ...idInput,
      required: true,
    },
    emoji: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 32,
    },
  },

  exits: {
    messageNotFound: { responseType: 'notFound' },
    messageDeleted: { responseType: 'conflict' },
    conversationBlocked: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const message = await ChatMessage.qm.getOneById(inputs.messageId);
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation && (await sails.helpers.chat.getConversationAccess(conversation, currentUser));

    if (!message || !access) {
      throw Errors.MESSAGE_NOT_FOUND;
    }
    if (message.deletedAt) {
      throw Errors.MESSAGE_DELETED;
    }
    if (!access.canWrite) {
      throw Errors.CONVERSATION_BLOCKED;
    }

    const isMessageDeleted = await sails.getDatastore().transaction(async (db) => {
      const lockResult = await sails
        .sendNativeQuery(
          `SELECT deleted_at
           FROM chat_message
           WHERE id = $1
           FOR UPDATE`,
          [message.id],
        )
        .usingConnection(db);
      if (lockResult.rows.length === 0 || lockResult.rows[0].deleted_at) {
        return true;
      }

      const existing = await ChatMessageReaction.findOne({
        messageId: message.id,
        userId: currentUser.id,
        emoji: inputs.emoji,
      }).usingConnection(db);
      if (existing) {
        await ChatMessageReaction.destroyOne(existing.id).usingConnection(db);
      } else {
        await ChatMessageReaction.create({
          messageId: message.id,
          userId: currentUser.id,
          emoji: inputs.emoji,
        }).usingConnection(db);
      }

      return false;
    });
    if (isMessageDeleted) {
      throw Errors.MESSAGE_DELETED;
    }

    const extras = await sails.helpers.chat.getMessageExtras([message.id]);
    const item = sails.helpers.chat.presentMessage({ ...message, ...extras[message.id] });
    sails.sockets.broadcast(
      `chatConversation:${message.conversationId}`,
      'chatMessageUpdate',
      { item },
      this.req,
    );

    return { item };
  },
};
