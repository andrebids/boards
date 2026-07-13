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

    if (inputs.conversation.type === ChatConversation.Types.PROJECT_DIRECT) {
      if (!participant || participants.length !== 2) {
        return null;
      }

      return {
        conversation: inputs.conversation,
        project,
        participant,
        participants,
        memberUserIds,
        canWrite: participants.every(({ userId }) => memberUserIds.includes(userId)),
      };
    }

    if (inputs.conversation.type === ChatConversation.Types.PROJECT_CUSTOM_GROUP) {
      if (!participant || inputs.conversation.archivedAt) {
        return null;
      }

      const activeParticipants = participants.filter(({ userId }) =>
        memberUserIds.includes(userId),
      );
      return {
        conversation: inputs.conversation,
        project,
        participant,
        participants: activeParticipants,
        memberUserIds,
        canWrite: activeParticipants.length >= 2,
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
    };
  },
};
