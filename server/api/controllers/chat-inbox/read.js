/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ID_REGEX, isIdInRange } = require('../../../utils/validators');

const Errors = {
  INVALID_CONVERSATIONS: { invalidConversations: 'Invalid conversations' },
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

const getAllUnreadConversationIds = async (user, before, conversationIds = []) => {
  const page = await sails.helpers.chat.getInbox.with({
    user,
    filter: 'unread',
    before,
    limit: 100,
  });
  const nextConversationIds = [
    ...conversationIds,
    ...page.items.map(({ conversationId }) => conversationId),
  ];

  return page.meta.nextCursor
    ? getAllUnreadConversationIds(user, page.meta.nextCursor, nextConversationIds)
    : nextConversationIds;
};

module.exports = {
  inputs: {
    conversationIds: {
      type: 'json',
    },
    all: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  exits: {
    invalidConversations: { responseType: 'unprocessableEntity' },
    conversationNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    let conversationIds = Array.isArray(inputs.conversationIds) ? inputs.conversationIds : [];

    if (inputs.all) {
      if (conversationIds.length > 0) {
        throw Errors.INVALID_CONVERSATIONS;
      }

      conversationIds = await getAllUnreadConversationIds(this.req.currentUser);

      if (conversationIds.length === 0) {
        return {
          items: [],
          meta: {
            unreadConversationTotal: 0,
            unreadMentionConversationTotal: 0,
            unreadMessageTotal: 0,
            unreadConversationTotalsByProjectId: {},
          },
        };
      }
    }

    const uniqueConversationIds = [...new Set(conversationIds)];
    if (
      conversationIds.length === 0 ||
      (!inputs.all && conversationIds.length > 100) ||
      uniqueConversationIds.length !== conversationIds.length ||
      conversationIds.some((id) => typeof id !== 'string' || !ID_REGEX.test(id) || !isIdInRange(id))
    ) {
      throw Errors.INVALID_CONVERSATIONS;
    }

    const conversations = await ChatConversation.qm.getByIds(uniqueConversationIds);
    if (conversations.length !== uniqueConversationIds.length) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const accesses = await Promise.all(
      conversations.map((conversation) =>
        sails.helpers.chat.getConversationAccess.with({
          conversation,
          user: this.req.currentUser,
          ensureParticipant: true,
        }),
      ),
    );
    if (accesses.some((access) => !access)) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const lastMessages = await ChatMessage.qm.getLastByConversationIds(uniqueConversationIds);
    const lastMessageByConversationId = new Map(
      lastMessages.map((message) => [message.conversationId, message]),
    );
    const readStates = await Promise.all(
      conversations.map((conversation) => {
        const lastMessage = lastMessageByConversationId.get(conversation.id);
        return sails.helpers.chat.markAsRead.with({
          conversation,
          user: this.req.currentUser,
          messageId: lastMessage && lastMessage.id,
          skipLatestMessage: !lastMessage,
          request: this.req,
        });
      }),
    );

    return {
      items: inputs.all ? [] : readStates,
      ...(inputs.all && {
        meta: {
          unreadConversationTotal: 0,
          unreadMentionConversationTotal: 0,
          unreadMessageTotal: 0,
          unreadConversationTotalsByProjectId: {},
        },
      }),
    };
  },
};
