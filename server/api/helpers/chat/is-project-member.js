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
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const userIds = await sails.helpers.chat.getProjectMemberUserIds(inputs.project);
    return userIds.includes(inputs.userId);
  },
};
