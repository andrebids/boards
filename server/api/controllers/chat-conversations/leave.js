/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const {
  withConversationLock,
  getActiveParticipants,
  getHistoryUpperBound,
  leaveConversationRooms,
  publishCurrentConversationState,
} = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

module.exports = {
  inputs: { id: { ...idInput, required: true } },
  exits: { conversationNotFound: { responseType: 'notFound' } },

  async fn(inputs) {
    const { currentUser } = this.req;
    const initialConversation = await ChatConversation.qm.getOneById(inputs.id);
    const initialAccess =
      initialConversation &&
      (await sails.helpers.chat.getConversationAccess(initialConversation, currentUser));
    if (
      !initialAccess ||
      initialConversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP ||
      initialAccess.isHistorical
    ) {
      throw Errors.CONVERSATION_NOT_FOUND;
    }

    let result;
    await withConversationLock(inputs.id, async ({ db, conversation, participants }) => {
      const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(initialAccess.project);
      const participant = participants.find(
        ({ userId, leftAt }) => userId === currentUser.id && !leftAt,
      );
      if (
        !conversation ||
        conversation.archivedAt ||
        conversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP ||
        !participant ||
        !memberUserIds.includes(currentUser.id)
      ) {
        throw Errors.CONVERSATION_NOT_FOUND;
      }

      const activeParticipants = getActiveParticipants(participants, memberUserIds);
      const historyVisibleThroughMessageId = await getHistoryUpperBound(conversation.id, db);
      const leftAt = new Date().toISOString();
      const leftParticipant = await ChatParticipant.updateOne(participant.id)
        .set({
          leftAt,
          leftReason: 'left',
          historyVisibleThroughMessageId,
          ...(participant.role === ChatParticipant.Roles.OWNER && {
            role: ChatParticipant.Roles.MEMBER,
          }),
        })
        .fetch()
        .usingConnection(db);

      const remainingParticipants = activeParticipants.filter(({ id }) => id !== participant.id);
      let archivedConversation = conversation;
      if (remainingParticipants.length === 0) {
        archivedConversation = await ChatConversation.updateOne(conversation.id)
          .set({ archivedAt: leftAt })
          .fetch()
          .usingConnection(db);
      } else if (participant.role === ChatParticipant.Roles.OWNER) {
        const nextOwner = remainingParticipants[0];
        await ChatParticipant.updateOne(nextOwner.id)
          .set({ role: ChatParticipant.Roles.OWNER })
          .usingConnection(db);
        nextOwner.role = ChatParticipant.Roles.OWNER;
      }

      await leaveConversationRooms(conversation.id, currentUser.id);
      result = {
        conversation: archivedConversation,
        leftParticipant,
        activeParticipants: remainingParticipants,
      };
    });

    await publishCurrentConversationState(inputs.id, {
      historicalUserIds: [currentUser.id],
    });

    return { item: result.leftParticipant };
  },
};
