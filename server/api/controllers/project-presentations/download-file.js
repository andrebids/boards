/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PRESENTATION_FILE_NOT_FOUND: { presentationFileNotFound: 'Presentation file not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    presentationFileNotFound: { responseType: 'notFound' },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const presentation = await ProjectPresentation.qm.getOneById(inputs.id);
    const project = presentation && (await Project.qm.getOneById(presentation.projectId));
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));

    if (
      !presentation ||
      !access ||
      !access.accessibleBoardIds.includes(presentation.boardId) ||
      !presentation.documentData
    ) {
      throw Errors.PRESENTATION_FILE_NOT_FOUND;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    let readStream;
    try {
      readStream = await fileManager.read(
        `${sails.config.custom.projectPresentationsPathSegment}/${presentation.id}/presentation.pptx`,
      );
    } catch (error) {
      throw Errors.PRESENTATION_FILE_NOT_FOUND;
    }

    this.res.type(
      presentation.documentData.mimeType ||
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    this.res.set('Cache-Control', 'private, no-store');

    return exits.success(readStream);
  },
};
