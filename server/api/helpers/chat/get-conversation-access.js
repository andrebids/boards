/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    conversation: {
      type: 'ref',
      required: true,
    },
    user: {
      type: 'ref',
      required: true,
    },
    ensureParticipant: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  async fn(inputs) {
    const project = await Project.qm.getOneById(inputs.conversation.projectId);
    if (!project || project.chatMode === Project.ChatModes.DISABLED) {
      return null;
    }

    const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(project);
    if (!memberUserIds.includes(inputs.user.id)) {
      return null;
    }

    let participants = await ChatParticipant.qm.getByConversationId(inputs.conversation.id);
    let participant = participants.find(({ userId }) => userId === inputs.user.id);
    const isActive = (candidate) => !candidate.leftAt;
    const historicalParticipant =
      participant && !isActive(participant) && !participant.historyHiddenAt ? participant : null;
    participant = participant && isActive(participant) ? participant : null;

    if (inputs.conversation.type === ChatConversation.Types.PROJECT_DIRECT) {
      if (inputs.conversation.archivedAt || !participant || participants.length !== 2) {
        return null;
      }

      return {
        conversation: inputs.conversation,
        project,
        participant,
        participants,
        memberUserIds,
        canWrite: participants.every(({ userId }) => memberUserIds.includes(userId)),
        isHistorical: false,
      };
    }

    if (inputs.conversation.type === ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
      const activeParticipants = participants.filter(
        ({ userId, leftAt }) => !leftAt && memberUserIds.includes(userId),
      );

      if (!participant && !historicalParticipant) {
        return null;
      }
      if (inputs.conversation.archivedAt && !historicalParticipant) {
        return null;
      }

      if (historicalParticipant) {
        return {
          conversation: inputs.conversation,
          project,
          participant: historicalParticipant,
          participants: activeParticipants,
          memberUserIds,
          canWrite: false,
          canManage: false,
          isHistorical: true,
          canReadHistory: true,
        };
      }

      return {
        conversation: inputs.conversation,
        project,
        participant,
        participants: activeParticipants,
        memberUserIds,
        canWrite: activeParticipants.length >= 2,
        canManage: participant.role === ChatParticipant.Roles.OWNER,
        isHistorical: false,
        canReadHistory: true,
      };
    }

    if (inputs.conversation.type !== ChatConversation.Types.PROJECT_GROUP) {
      return null;
    }

    if (!participant && inputs.ensureParticipant) {
      participant = await sails.helpers.chat.ensureParticipant(
        inputs.conversation.id,
        inputs.user.id,
      );
      participants = [...participants, participant];
    }

    return {
      conversation: inputs.conversation,
      project,
      participant,
      participants,
      memberUserIds,
      canWrite: true,
      isHistorical: false,
    };
  },
};
