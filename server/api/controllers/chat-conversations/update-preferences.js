/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  INVALID_MUTED_UNTIL: { invalidMutedUntil: 'Invalid muted until value' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    notificationLevel: {
      type: 'string',
      isIn: Object.values(ChatParticipant.NotificationLevels),
      required: true,
    },
    mutedUntil: { type: 'string', allowNull: true },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    invalidMutedUntil: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const conversation = await ChatConversation.qm.getOneById(inputs.id);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess.with({
        conversation,
        user: this.req.currentUser,
        ensureParticipant: true,
      }));
    if (!access || !access.participant) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    let mutedUntil = null;
    if (inputs.mutedUntil) {
      const date = new Date(inputs.mutedUntil);
      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        throw Errors.INVALID_MUTED_UNTIL;
      }
      mutedUntil = date.toISOString();
    }

    const item = await ChatParticipant.qm.updateOne(access.participant.id, {
      notificationLevel: inputs.notificationLevel,
      mutedUntil,
      isMuted: inputs.notificationLevel === ChatParticipant.NotificationLevels.NONE || !!mutedUntil,
    });
    sails.sockets.broadcast(`@user:${this.req.currentUser.id}`, 'chatParticipantUpdate', {
      item: { ...item, projectId: conversation.projectId },
    });
    return { item };
  },
};
