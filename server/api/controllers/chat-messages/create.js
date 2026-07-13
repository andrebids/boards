/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { extractMentionIds } = require('../../../utils/mentions');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  CONVERSATION_BLOCKED: { conversationBlocked: 'Conversation is blocked' },
  TEXT_MUST_NOT_BE_EMPTY: { textMustNotBeEmpty: 'Text must not be empty' },
  MENTION_NOT_ALLOWED: { mentionNotAllowed: 'Mention not allowed' },
  REPLY_MESSAGE_NOT_FOUND: { replyMessageNotFound: 'Reply message not found' },
};

module.exports = {
  inputs: {
    conversationId: {
      ...idInput,
      required: true,
    },
    text: {
      type: 'string',
      maxLength: 10000,
      required: true,
    },
    hasAttachments: {
      type: 'boolean',
      defaultsTo: false,
    },
    clientMessageId: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
    },
    replyToMessageId: idInput,
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
    conversationBlocked: { responseType: 'forbidden' },
    textMustNotBeEmpty: { responseType: 'unprocessableEntity' },
    mentionNotAllowed: { responseType: 'unprocessableEntity' },
    replyMessageNotFound: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const text = inputs.text.trim();
    if (!text && !inputs.hasAttachments) {
      throw Errors.TEXT_MUST_NOT_BE_EMPTY;
    }

    const conversation = await ChatConversation.qm.getOneById(inputs.conversationId);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess.with({
        conversation,
        user: currentUser,
        ensureParticipant: true,
      }));
    if (!access) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }
    if (!access.canWrite) {
      throw Errors.CONVERSATION_BLOCKED;
    }

    const mentionUserIds = [...new Set(extractMentionIds(text))];
    const allowedMentionUserIds =
      conversation.type === ChatConversation.Types.PROJECT_DIRECT
        ? sails.helpers.utils.mapRecords(access.participants, 'userId', true)
        : access.memberUserIds;
    if (mentionUserIds.some((userId) => !allowedMentionUserIds.includes(userId))) {
      throw Errors.MENTION_NOT_ALLOWED;
    }

    const message = await sails.helpers.chat.createMessage
      .with({
        conversation,
        project: access.project,
        participantUserIds: sails.helpers.utils.mapRecords(access.participants, 'userId', true),
        memberUserIds: access.memberUserIds,
        text,
        clientMessageId: inputs.clientMessageId,
        replyToMessageId: inputs.replyToMessageId,
        user: currentUser,
        request: this.req,
      })
      .intercept('replyMessageNotFound', () => Errors.REPLY_MESSAGE_NOT_FOUND);

    return {
      item: sails.helpers.chat.presentMessage(message),
      included: {
        users: [sails.helpers.users.presentOne(currentUser, currentUser)],
      },
    };
  },
};
