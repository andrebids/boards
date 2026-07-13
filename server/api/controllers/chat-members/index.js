/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const userIds = await sails.helpers.chat.getProjectMemberUserIds(project);
    if (!userIds.includes(currentUser.id)) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const users = await User.qm.getByIds(userIds);
    return {
      items: sails.helpers.users.presentMany(users, currentUser),
    };
  },
};
