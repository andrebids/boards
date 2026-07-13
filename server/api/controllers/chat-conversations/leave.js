/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

module.exports = {
  inputs: { id: { ...idInput, required: true } },
  exits: { conversationNotFound: { responseType: 'notFound' } },

  async fn(inputs) {
    const conversation = await ChatConversation.qm.getOneById(inputs.id);
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (!access || conversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    const remainingParticipants = access.participants.filter(
      ({ id }) => id !== access.participant.id,
    );
    let archivedConversation = null;
    await sails.getDatastore().transaction(async (db) => {
      await ChatParticipant.destroyOne(access.participant.id).usingConnection(db);
      if (remainingParticipants.length < 2) {
        archivedConversation = await ChatConversation.updateOne(conversation.id)
          .set({ archivedAt: new Date().toISOString() })
          .usingConnection(db);
      } else if (access.participant.role === ChatParticipant.Roles.OWNER) {
        await ChatParticipant.updateOne(remainingParticipants[0].id)
          .set({ role: ChatParticipant.Roles.OWNER })
          .usingConnection(db);
        remainingParticipants[0].role = ChatParticipant.Roles.OWNER;
      }
    });

    const revokedUserIds = archivedConversation
      ? [this.req.currentUser.id, ...remainingParticipants.map(({ userId }) => userId)]
      : [this.req.currentUser.id];
    revokedUserIds.forEach((userId) => {
      sails.sockets.removeRoomMembersFromRooms(
        `@user:${userId}`,
        `chatConversation:${conversation.id}`,
      );
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationAccessRevoke', {
        item: { conversationId: conversation.id, projectId: conversation.projectId },
      });
    });

    if (!archivedConversation) {
      remainingParticipants.forEach(({ userId }) => {
        sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
          item: conversation,
          included: { chatParticipants: remainingParticipants },
        });
      });
    }
    return { item: access.participant };
  },
};
