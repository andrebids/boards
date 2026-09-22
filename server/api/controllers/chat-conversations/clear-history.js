/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { withConversationLock } = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    hideConversation: { type: 'boolean', defaultsTo: false },
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const conversation = await ChatConversation.qm.getOneById(inputs.id);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess.with({
        conversation,
        user: currentUser,
        ensureParticipant: conversation.type === ChatConversation.Types.PROJECT_GROUP,
      }));

    if (!access || !access.participant) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    if (inputs.hideConversation && !access.isHistorical) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }
    if (inputs.hideConversation && access.isHistorical) {
      const participant = await withConversationLock(
        conversation.id,
        async ({ db, conversation: lockedConversation }) => {
          if (!lockedConversation) throw Errors.CONVERSATION_NOT_FOUND;
          const lockedParticipant = await ChatParticipant.findOne({
            conversationId: lockedConversation.id,
            userId: currentUser.id,
          }).usingConnection(db);

          if (!lockedParticipant || !lockedParticipant.leftAt) {
            throw Errors.CONVERSATION_NOT_FOUND;
          }

          return ChatParticipant.updateOne({ id: lockedParticipant.id })
            .set({ historyHiddenAt: new Date().toISOString() })
            .fetch()
            .usingConnection(db);
        },
      );

      const item = {
        conversationId: conversation.id,
        conversationType: conversation.type,
        projectId: conversation.projectId,
        userId: currentUser.id,
        historyClearedThroughMessageId: participant.historyClearedThroughMessageId || null,
        lastReadMessageId: participant.lastReadMessageId || null,
        lastReadAt: participant.lastReadAt || null,
        historyHiddenAt: participant.historyHiddenAt,
        hideConversation: true,
      };

      sails.sockets.broadcast(
        `@user:${currentUser.id}`,
        'chatConversationHistoryClear',
        { item },
        this.req,
      );

      return { item };
    }

    const lastMessage = access.isHistorical
      ? access.participant.historyVisibleThroughMessageId && {
          id: access.participant.historyVisibleThroughMessageId,
        }
      : await ChatMessage.qm.getLastByConversationId(conversation.id);
    const clearedAt = new Date().toISOString();
    const participant = lastMessage
      ? await ChatParticipant.qm.clearHistory(access.participant.id, lastMessage.id, clearedAt)
      : access.participant;
    const item = {
      conversationId: conversation.id,
      conversationType: conversation.type,
      projectId: conversation.projectId,
      userId: currentUser.id,
      historyClearedThroughMessageId: participant.historyClearedThroughMessageId || null,
      lastReadMessageId: participant.lastReadMessageId || null,
      lastReadAt: participant.lastReadAt || null,
    };

    sails.sockets.broadcast(
      `@user:${currentUser.id}`,
      'chatConversationHistoryClear',
      { item },
      this.req,
    );

    return { item };
  },
};
