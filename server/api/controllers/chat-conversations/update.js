/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const {
  withConversationLock,
  publishCurrentConversationState,
} = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    title: { type: 'string', required: true, maxLength: 80 },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const result = await withConversationLock(inputs.id, async ({ db, conversation }) => {
      const access =
        conversation &&
        (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
      if (!access || conversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
        throw Errors.CONVERSATION_NOT_FOUND;
      }
      if (access.isHistorical || !access.canManage) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }

      const title = inputs.title.trim();
      if (!title) {
        throw Errors.CONVERSATION_NOT_FOUND;
      }
      const item = await ChatConversation.updateOne(conversation.id)
        .set({ title })
        .usingConnection(db);
      return { item };
    });
    await publishCurrentConversationState(inputs.id);
    return result;
  },
};
