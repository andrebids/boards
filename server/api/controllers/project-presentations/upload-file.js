/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fsPromises = require('fs').promises;

const { idInput } = require('../../../utils/inputs');
const getFilePath = require('../../../utils/project-presentation-file-path');

const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PRESENTATION_NOT_FOUND: { presentationNotFound: 'Presentation not found' },
  NO_FILE_WAS_UPLOADED: { noFileWasUploaded: 'No file was uploaded' },
  INVALID_PRESENTATION_FILE: { invalidPresentationFile: 'Invalid presentation file' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    presentationNotFound: { responseType: 'notFound' },
    noFileWasUploaded: { responseType: 'unprocessableEntity' },
    invalidPresentationFile: { responseType: 'unprocessableEntity' },
    uploadError: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const presentation = await ProjectPresentation.qm.getOneById(inputs.id);
    const project = presentation && (await Project.qm.getOneById(presentation.projectId));
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));

    if (!presentation || !access || !access.accessibleBoardIds.includes(presentation.boardId)) {
      throw Errors.PRESENTATION_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let files;
    try {
      files = await sails.helpers.utils.receiveFile.with({
        paramName: 'file',
        req: this.req,
        maxBytes: sails.config.custom.attachmentMaxBytes,
      });
    } catch (error) {
      return exits.uploadError(error.message || 'Could not receive presentation file');
    }

    if (files.length === 0) {
      throw Errors.NO_FILE_WAS_UPLOADED;
    }

    const file = _.last(files);
    if (file.type !== PRESENTATION_MIME_TYPE || !Number.isFinite(file.size) || file.size === 0) {
      throw Errors.INVALID_PRESENTATION_FILE;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    try {
      await fileManager.saveFromPath(getFilePath(presentation.id), file.fd);
    } finally {
      await fsPromises.rm(file.fd, { force: true });
    }

    const documentData = {
      mimeType: PRESENTATION_MIME_TYPE,
      sizeInBytes: file.size,
    };
    const updatedPresentation = await ProjectPresentation.qm.updateOne(presentation.id, {
      documentData,
    });

    return exits.success({
      item: sails.helpers.projectPresentations.presentOne(updatedPresentation, true),
    });
  },
};
