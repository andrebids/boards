/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
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
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let presentation = await ProjectPresentation.qm.getOneByProjectId(project.id);
    if (presentation) {
      if (!presentation.isEnabled) {
        presentation = await ProjectPresentation.qm.updateOne(presentation.id, { isEnabled: true });
      }
    } else {
      presentation = await ProjectPresentation.qm.createOne({
        projectId: project.id,
        createdByUserId: currentUser.id,
        isEnabled: true,
        title: 'Apresentação',
      });
    }

    const payload = {
      item: sails.helpers.projectPresentations.presentOne(presentation, true),
      meta: { canEdit: true },
    };
    access.memberUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `@user:${userId}`,
        'projectPresentationUpdate',
        { item: _.omit(presentation, ['cryptpadEditKey', 'cryptpadViewKey']) },
        this.req,
      );
    });

    if (this.req.isSocket) {
      sails.sockets.join(this.req, `projectPresentation:${presentation.id}`);
    }

    return payload;
  },
};
