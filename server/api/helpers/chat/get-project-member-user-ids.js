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
  },

  async fn(inputs) {
    if (inputs.project.chatMode === Project.ChatModes.DISABLED) {
      return [];
    }

    const scoper = sails.helpers.projects.makeScoper.with({ record: inputs.project });
    const projectManagerUserIds = await scoper.getProjectManagerUserIds();

    if (inputs.project.chatMode === Project.ChatModes.MANAGERS) {
      return projectManagerUserIds;
    }

    const boardMemberUserIds = await scoper.getBoardMemberUserIdsForWholeProject();
    const userIdsWithFullProjectVisibility = await scoper.getUserIdsWithFullProjectVisibility();

    return _.union(projectManagerUserIds, boardMemberUserIds, userIdsWithFullProjectVisibility);
  },
};
