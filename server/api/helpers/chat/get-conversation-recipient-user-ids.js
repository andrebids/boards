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
  },

  async fn(inputs) {
    const project = await Project.qm.getOneById(inputs.conversation.projectId);
    if (!project || project.chatMode === Project.ChatModes.DISABLED) {
      return [];
    }

    const memberUserIds = await sails.helpers.chat.getProjectMemberUserIds(project);
    if (inputs.conversation.type === ChatConversation.Types.PROJECT_GROUP) {
      return memberUserIds;
    }

    if (
      inputs.conversation.type !== ChatConversation.Types.PROJECT_DIRECT &&
      inputs.conversation.type !== ChatConversation.Types.PROJECT_CUSTOM_GROUP
    ) {
      return [];
    }

    if (
      inputs.conversation.type === ChatConversation.Types.PROJECT_CUSTOM_GROUP &&
      inputs.conversation.archivedAt
    ) {
      return [];
    }

    const participants = await ChatParticipant.qm.getByConversationId(inputs.conversation.id);
    return sails.helpers.utils
      .mapRecords(participants, 'userId', true)
      .filter((userId) => memberUserIds.includes(userId));
  },
};
