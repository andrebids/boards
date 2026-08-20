/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    user: { type: 'ref', required: true },
  },

  async fn(inputs) {
    const scoper = sails.helpers.projects.makeScoper.with({ record: inputs.project });
    const memberUserIds = await scoper.getProjectRelatedUserIds();

    if (!memberUserIds.includes(inputs.user.id)) {
      return null;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(
      inputs.user.id,
      inputs.project.id,
    );
    const canEdit =
      isProjectManager ||
      (inputs.user.role === User.Roles.ADMIN && !inputs.project.ownerProjectManagerId);

    let accessibleBoardIds;
    if (canEdit) {
      const boards = await Board.qm.getByProjectId(inputs.project.id);
      accessibleBoardIds = sails.helpers.utils.mapRecords(boards);
    } else {
      const boardMemberships = await BoardMembership.qm.getByProjectId(inputs.project.id);
      accessibleBoardIds = boardMemberships
        .filter(({ userId }) => userId === inputs.user.id)
        .map(({ boardId }) => boardId);
    }

    return { canEdit, memberUserIds, accessibleBoardIds };
  },
};
