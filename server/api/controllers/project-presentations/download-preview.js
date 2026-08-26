/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const getPresentationFilePath = require('../../../utils/project-presentation-file-path');

const Errors = {
  PREVIEW_NOT_FOUND: { previewNotFound: 'Presentation preview not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    previewNotFound: { responseType: 'notFound' },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const presentation = await ProjectPresentation.qm.getOneById(inputs.id);
    const project = presentation && (await Project.qm.getOneById(presentation.projectId));
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));
    const documentData = presentation && presentation.documentData;
    const preview = documentData && documentData.preview;

    if (
      !presentation ||
      !access ||
      !access.accessibleBoardIds.includes(presentation.boardId) ||
      !preview ||
      preview.status !== 'ready' ||
      !preview.filename ||
      preview.sourceFilename !== documentData.filename
    ) {
      throw Errors.PREVIEW_NOT_FOUND;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    let readStream;
    try {
      readStream = await fileManager.read(
        getPresentationFilePath(presentation.id, preview.filename),
      );
    } catch (error) {
      throw Errors.PREVIEW_NOT_FOUND;
    }

    this.res.type(preview.mimeType || 'image/jpeg');
    this.res.set('Cache-Control', 'private, no-store');

    return exits.success(readStream);
  },
};
