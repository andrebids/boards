/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    project: {
      type: 'ref',
      required: true,
    },
    affectedUserIds: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const conversations = await ChatConversation.qm.getByProjectId(inputs.project.id);
    const conversationIds = sails.helpers.utils.mapRecords(conversations);
    const participants =
      conversationIds.length > 0
        ? await ChatParticipant.qm.getByConversationIds(conversationIds)
        : [];
    const boardMemberships = await BoardMembership.qm.getByProjectId(inputs.project.id);
    const scoper = sails.helpers.projects.makeScoper.with({ record: inputs.project });
    const projectManagerUserIds = await scoper.getProjectManagerUserIds();
    const candidateUserIds = _.union(
      inputs.affectedUserIds || [],
      projectManagerUserIds,
      sails.helpers.utils.mapRecords(boardMemberships, 'userId', true),
      sails.helpers.utils.mapRecords(participants, 'userId', true),
    );
    const authorizedUserIds = await sails.helpers.chat.getProjectMemberUserIds(inputs.project);
    const unauthorizedUserIds = _.difference(candidateUserIds, authorizedUserIds);

    const customConversationIds = conversations
      .filter(({ type }) => type === ChatConversation.Types.PROJECT_CUSTOM_GROUP)
      .map(({ id }) => id);
    if (customConversationIds.length > 0 && unauthorizedUserIds.length > 0) {
      await ChatParticipant.destroy({
        conversationId: customConversationIds,
        userId: unauthorizedUserIds,
      });
    }

    const leaveRoom = (userId, conversationId) =>
      new Promise((resolve, reject) => {
        sails.sockets.removeRoomMembersFromRooms(
          `@user:${userId}`,
          `chatConversation:${conversationId}`,
          (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          },
        );
      });

    await Promise.all(
      unauthorizedUserIds.flatMap((userId) =>
        conversationIds.map((conversationId) => leaveRoom(userId, conversationId)),
      ),
    );

    unauthorizedUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatProjectAccessRevoke', {
        item: { projectId: inputs.project.id },
      });
    });

    return {
      revokedUserIds: unauthorizedUserIds,
      conversationIds,
    };
  },
};
