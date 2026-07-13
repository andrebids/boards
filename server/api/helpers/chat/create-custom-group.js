/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    user: { type: 'ref', required: true },
    title: { type: 'string', required: true },
    participantUserIds: { type: 'ref', required: true },
  },

  async fn(inputs) {
    return sails.getDatastore().transaction(async (db) => {
      const conversation = await ChatConversation.create({
        projectId: inputs.project.id,
        type: ChatConversation.Types.PROJECT_CUSTOM_GROUP,
        title: inputs.title,
        createdByUserId: inputs.user.id,
      })
        .fetch()
        .usingConnection(db);

      const participants = await ChatParticipant.createEach(
        inputs.participantUserIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role:
            userId === inputs.user.id ? ChatParticipant.Roles.OWNER : ChatParticipant.Roles.MEMBER,
        })),
      )
        .fetch()
        .usingConnection(db);

      return { conversation, participants };
    });
  },
};
