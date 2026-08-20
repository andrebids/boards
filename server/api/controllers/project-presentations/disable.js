/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PRESENTATION_NOT_FOUND: { presentationNotFound: 'Presentation not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    presentationNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    let presentation = await ProjectPresentation.qm.getOneById(inputs.id);
    const project = presentation && (await Project.qm.getOneById(presentation.projectId));
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));

    if (!presentation || !access) {
      throw Errors.PRESENTATION_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    presentation = await ProjectPresentation.qm.updateOne(presentation.id, { isEnabled: false });
    const payload = { item: presentation };
    access.memberUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'projectPresentationUpdate', payload, this.req);
    });

    return payload;
  },
};
