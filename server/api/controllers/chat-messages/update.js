/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { extractMentionIds } = require('../../../utils/mentions');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  CONVERSATION_BLOCKED: { conversationBlocked: 'Conversation is blocked' },
  MESSAGE_ALREADY_DELETED: { messageAlreadyDeleted: 'Message is already deleted' },
  TEXT_MUST_NOT_BE_EMPTY: { textMustNotBeEmpty: 'Text must not be empty' },
  MENTION_NOT_ALLOWED: { mentionNotAllowed: 'Mention not allowed' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    text: {
      type: 'string',
      maxLength: 10000,
      required: true,
    },
  },

  exits: {
    messageNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
    conversationBlocked: { responseType: 'forbidden' },
    messageAlreadyDeleted: { responseType: 'conflict' },
    textMustNotBeEmpty: { responseType: 'unprocessableEntity' },
    mentionNotAllowed: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const text = inputs.text.trim();
    if (!text) {
      throw Errors.TEXT_MUST_NOT_BE_EMPTY;
    }

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
    if (!access.canWrite) {
      throw Errors.CONVERSATION_BLOCKED;
    }
    if (message.deletedAt) {
      throw Errors.MESSAGE_ALREADY_DELETED;
    }
    const allowedMentionUserIds =
      conversation.type === ChatConversation.Types.PROJECT_DIRECT
        ? sails.helpers.utils.mapRecords(access.participants, 'userId', true)
        : access.memberUserIds;
    if (
      [...new Set(extractMentionIds(text))].some(
        (userId) => !allowedMentionUserIds.includes(userId),
      )
    ) {
      throw Errors.MENTION_NOT_ALLOWED;
    }

    const updatedMessage = await sails.helpers.chat.updateMessage.with({
      message,
      conversation,
      recipientUserIds:
        conversation.type === ChatConversation.Types.PROJECT_GROUP
          ? access.memberUserIds
          : sails.helpers.utils.mapRecords(access.participants, 'userId', true),
      text,
      request: this.req,
    });
    if (!updatedMessage) {
      const currentMessage = await ChatMessage.qm.getOneById(message.id);
      if (currentMessage && currentMessage.deletedAt) {
        throw Errors.MESSAGE_ALREADY_DELETED;
      }
      throw Errors.MESSAGE_NOT_FOUND;
    }

    return { item: sails.helpers.chat.presentMessage(updatedMessage) };
  },
};
