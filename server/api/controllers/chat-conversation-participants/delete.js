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
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    conversationId: { ...idInput, required: true },
    userId: { ...idInput, required: true },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const initialConversation = await ChatConversation.qm.getOneById(inputs.conversationId);
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
    await withConversationLock(
      inputs.conversationId,
      async ({ db, conversation, participants }) => {
        const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(
          initialAccess.project,
        );
        const owner = participants.find(
          ({ userId, role, leftAt }) =>
            userId === currentUser.id && !leftAt && role === ChatParticipant.Roles.OWNER,
        );
        const target = participants.find(
          ({ userId, leftAt }) => userId === inputs.userId && !leftAt,
        );
        if (
          !conversation ||
          conversation.archivedAt ||
          !owner ||
          !memberUserIds.includes(currentUser.id)
        ) {
          throw Errors.NOT_ENOUGH_RIGHTS;
        }
        if (!target) {
          throw Errors.CONVERSATION_NOT_FOUND;
        }
        if (target.role === ChatParticipant.Roles.OWNER) {
          throw Errors.NOT_ENOUGH_RIGHTS;
        }

        const historyVisibleThroughMessageId = await getHistoryUpperBound(conversation.id, db);
        const leftParticipant = await ChatParticipant.updateOne(target.id)
          .set({
            leftAt: new Date().toISOString(),
            leftReason: 'removed',
            historyVisibleThroughMessageId,
            role: ChatParticipant.Roles.MEMBER,
          })
          .fetch()
          .usingConnection(db);
        const activeParticipants = getActiveParticipants(participants, memberUserIds).filter(
          ({ id }) => id !== target.id,
        );
        await leaveConversationRooms(conversation.id, inputs.userId);
        result = { conversation, leftParticipant, activeParticipants };
      },
    );

    await publishCurrentConversationState(inputs.conversationId, {
      historicalUserIds: [inputs.userId],
    });

    return { item: result.leftParticipant };
  },
};
