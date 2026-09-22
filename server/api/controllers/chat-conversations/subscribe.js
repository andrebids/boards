/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { withConversationLock, joinConversationRoom } = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  SOCKET_REQUIRED: { socketRequired: 'A socket request is required' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
    socketRequired: { responseType: 'badRequest' },
  },

  async fn(inputs) {
    if (!this.req.isSocket) {
      throw Errors.SOCKET_REQUIRED;
    }

    return withConversationLock(inputs.id, async () => {
      const conversation = await ChatConversation.qm.getOneById(inputs.id);
      const access =
        conversation &&
        (await sails.helpers.chat.getConversationAccess.with({
          conversation,
          user: this.req.currentUser,
          ensureParticipant: conversation.type === ChatConversation.Types.PROJECT_GROUP,
        }));

      if (!access || access.isHistorical) {
        sails.sockets.leave(this.req, `chatConversation:${inputs.id}`);
        throw Errors.CONVERSATION_NOT_FOUND;
      }

      await joinConversationRoom(this.req, conversation.id);
      return { item: conversation };
    });
  },
};
