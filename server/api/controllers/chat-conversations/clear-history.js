/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
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
        ensureParticipant: true,
      }));

    if (!access || !access.participant) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const lastMessage = await ChatMessage.qm.getLastByConversationId(conversation.id);
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
