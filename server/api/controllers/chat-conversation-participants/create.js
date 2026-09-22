/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const {
  withConversationLock,
  getActiveParticipants,
  publishCurrentConversationState,
} = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  INVALID_USERS: { invalidUsers: 'Invalid users' },
};

module.exports = {
  inputs: {
    conversationId: { ...idInput, required: true },
    userIds: { type: 'json', required: true },
  },
  exits: {
    conversationNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
    invalidUsers: { responseType: 'unprocessableEntity' },
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
    if (initialAccess.participant.role !== ChatParticipant.Roles.OWNER) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const userIds = Array.isArray(inputs.userIds) ? [...new Set(inputs.userIds)] : [];
    if (
      userIds.length === 0 ||
      userIds.some(
        (userId) => typeof userId !== 'string' || !initialAccess.memberUserIds.includes(userId),
      )
    ) {
      throw Errors.INVALID_USERS;
    }
    const users = await User.qm.getByIds(userIds);
    if (users.length !== userIds.length) {
      throw Errors.INVALID_USERS;
    }

    let result;
    await withConversationLock(
      inputs.conversationId,
      async ({ db, conversation, participants }) => {
        const owner = participants.find(
          ({ userId, role, leftAt }) =>
            userId === currentUser.id && !leftAt && role === ChatParticipant.Roles.OWNER,
        );
        if (!conversation || conversation.archivedAt || !owner) {
          throw Errors.NOT_ENOUGH_RIGHTS;
        }

        const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(
          initialAccess.project,
        );
        if (!memberUserIds.includes(currentUser.id)) {
          throw Errors.NOT_ENOUGH_RIGHTS;
        }
        if (userIds.some((userId) => !memberUserIds.includes(userId))) {
          throw Errors.INVALID_USERS;
        }

        const changedParticipants = [];
        // Apply participant writes sequentially on the shared transaction connection.
        /* eslint-disable no-restricted-syntax, no-await-in-loop */
        for (const userId of userIds) {
          const existing = participants.find((participant) => participant.userId === userId);
          if (existing && existing.leftAt) {
            const participant = await ChatParticipant.updateOne(existing.id)
              .set({
                leftAt: null,
                leftReason: null,
                historyVisibleThroughMessageId: null,
                historyHiddenAt: null,
              })
              .fetch()
              .usingConnection(db);
            changedParticipants.push(participant);
          } else if (!existing) {
            const participant = await ChatParticipant.create({
              conversationId: conversation.id,
              userId,
              role: ChatParticipant.Roles.MEMBER,
            })
              .fetch()
              .usingConnection(db);
            changedParticipants.push(participant);
          }
        }
        /* eslint-enable no-restricted-syntax, no-await-in-loop */

        const allParticipants = participants
          .filter(({ id }) => !changedParticipants.some((participant) => participant.id === id))
          .concat(changedParticipants);
        const activeParticipants = getActiveParticipants(allParticipants, memberUserIds);
        result = { conversation, participants: activeParticipants, changedParticipants };
      },
    );

    const payload = {
      item: {
        ...result.conversation,
        canWrite: result.participants.length >= 2,
        isHistorical: false,
      },
      included: {
        chatParticipants: result.participants,
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
    await publishCurrentConversationState(inputs.conversationId, {
      users: payload.included.users,
    });
    return payload;
  },
};
