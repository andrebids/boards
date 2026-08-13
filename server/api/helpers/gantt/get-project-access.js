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
    user: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const scoper = sails.helpers.projects.makeScoper.with({
      record: inputs.project,
    });
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

    return {
      canEdit,
      memberUserIds,
      project: inputs.project,
    };
  },
};
