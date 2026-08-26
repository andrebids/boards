/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fsPromises = require('fs').promises;
const { v4: uuid } = require('uuid');

const { idInput } = require('../../../utils/inputs');
const { validateChatAttachment } = require('../../../utils/chat-attachment-policy');
const getFilePath = require('../../../utils/project-presentation-file-path');

const PRESENTATION_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const Errors = {
  PRESENTATION_NOT_FOUND: { presentationNotFound: 'Presentation not found' },
  NO_FILE_WAS_UPLOADED: { noFileWasUploaded: 'No file was uploaded' },
  INVALID_PRESENTATION_FILE: { invalidPresentationFile: 'Invalid presentation file' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
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
      sails.log.warn('Project presentation upload rejected', {
        presentationId: inputs.id,
        phase: 'access',
      });
      throw Errors.PRESENTATION_NOT_FOUND;
    }
    let files;
    try {
      files = await sails.helpers.utils.receiveFile.with({
        paramName: 'file',
        req: this.req,
        maxBytes: sails.config.custom.attachmentMaxBytes,
      });
    } catch (error) {
      sails.log.warn('Project presentation upload failed', {
        presentationId: presentation.id,
        phase: 'receive',
      });
      return exits.uploadError(error.message || 'Could not receive presentation file');
    }

    if (files.length === 0) {
      sails.log.warn('Project presentation upload rejected', {
        presentationId: presentation.id,
        phase: 'receive',
      });
      throw Errors.NO_FILE_WAS_UPLOADED;
    }

    const file = _.last(files);
    const validation = await validateChatAttachment({
      fd: file.fd,
      filename: file.filename,
      size: file.size,
      maxBytes: sails.config.custom.attachmentMaxBytes,
    });

    if (
      !Number.isFinite(file.size) ||
      file.size === 0 ||
      !validation.isValid ||
      validation.extension !== 'pptx'
    ) {
      sails.log.warn('Project presentation upload rejected', {
        presentationId: presentation.id,
        phase: 'validation',
      });
      throw Errors.INVALID_PRESENTATION_FILE;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    const filename = `presentation-${uuid()}.pptx`;
    const filePath = getFilePath(presentation.id, filename);
    const previousFilePath = getFilePath(
      presentation.id,
      presentation.documentData && presentation.documentData.filename,
    );
    const previousPreviewFilename =
      presentation.documentData &&
      presentation.documentData.preview &&
      presentation.documentData.preview.filename;

    const discardUnpublishedFile = async () => {
      try {
        await fileManager.delete(filePath);
      } catch (error) {
        sails.log.warn('Failed to remove unfinished project presentation upload', {
          presentationId: presentation.id,
          phase: 'cleanup',
        });
      }
    };

    let updatedPresentation;
    try {
      await fileManager.saveFromPath(filePath, file.fd, PRESENTATION_MIME_TYPE);

      updatedPresentation = await ProjectPresentation.qm.updateOne(presentation.id, {
        documentData: {
          mimeType: PRESENTATION_MIME_TYPE,
          sizeInBytes: file.size,
          filename,
          preview: {
            status: 'pending',
            sourceFilename: filename,
          },
        },
      });

      if (!updatedPresentation) {
        throw Errors.PRESENTATION_NOT_FOUND;
      }
    } catch (error) {
      sails.log.warn('Project presentation upload failed', {
        presentationId: presentation.id,
        phase: 'persistence',
      });
      await discardUnpublishedFile();
      throw error;
    } finally {
      await fsPromises.rm(file.fd, { force: true });
    }

    if (previousFilePath !== filePath) {
      try {
        await fileManager.delete(previousFilePath);
      } catch (error) {
        sails.log.warn('Failed to remove replaced project presentation file', {
          presentationId: presentation.id,
          phase: 'cleanup',
        });
      }
    }

    if (previousPreviewFilename) {
      try {
        await fileManager.delete(getFilePath(presentation.id, previousPreviewFilename));
      } catch (error) {
        sails.log.warn('Failed to remove replaced project presentation preview', {
          presentationId: presentation.id,
          phase: 'cleanup',
        });
      }
    }

    try {
      await sails.helpers.projectPresentationPreview.enqueue.with({
        presentationId: presentation.id,
        sourceFilename: filename,
      });
    } catch (error) {
      sails.log.warn('Failed to queue project presentation preview', {
        presentationId: presentation.id,
        phase: 'preview-queue',
      });
    }

    sails.sockets.broadcast(
      `projectPresentation:${updatedPresentation.id}`,
      'projectPresentationUpdate',
      {
        item: _.omit(updatedPresentation, ['cryptpadEditKey', 'cryptpadViewKey']),
      },
    );

    sails.log.info('Project presentation upload completed', {
      presentationId: presentation.id,
      phase: 'completed',
    });

    return exits.success({
      item: sails.helpers.projectPresentations.presentOne(updatedPresentation, true),
    });
  },
};
