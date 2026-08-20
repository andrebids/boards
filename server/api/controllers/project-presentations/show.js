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
    projectId: { ...idInput, required: true },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));

    if (!access) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const presentation = await ProjectPresentation.qm.getOneByProjectId(project.id);

    if (presentation && this.req.isSocket) {
      sails.sockets.join(this.req, `projectPresentation:${presentation.id}`);
    }

    return {
      item: presentation
        ? sails.helpers.projectPresentations.presentOne(presentation, access.canEdit)
        : null,
      meta: { canEdit: access.canEdit },
    };
  },
};
