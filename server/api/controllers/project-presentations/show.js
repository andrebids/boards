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

    const presentations = await ProjectPresentation.qm.getByProjectId(project.id);
    const accessiblePresentations = presentations.filter(
      ({ boardId }) => boardId && access.accessibleBoardIds.includes(boardId),
    );

    if (this.req.isSocket) {
      accessiblePresentations.forEach((presentation) => {
        sails.sockets.join(this.req, `projectPresentation:${presentation.id}`);
      });
    }

    return {
      items: accessiblePresentations.map((presentation) =>
        sails.helpers.projectPresentations.presentOne(presentation, access.canEdit),
      ),
      meta: { canEdit: access.canEdit },
    };
  },
};
