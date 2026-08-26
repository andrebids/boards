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
  INVALID_PRESENTATION_FILE: {
    invalidPresentationFile: 'Invalid presentation file',
  },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    resetSession: { type: 'boolean', defaultsTo: false },
    keyVersion: { type: 'number' },
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

    const cleanupTemporaryFiles = async () => {
      await Promise.all(
        files.map(async ({ fd }) => {
          try {
            await fsPromises.rm(fd, { force: true });
          } catch (error) {
            sails.log.warn('Failed to remove temporary project presentation upload', {
              presentationId: presentation.id,
              phase: 'cleanup',
            });
          }
        }),
      );
    };

    try {
      if (files.length === 0) {
        sails.log.warn('Project presentation upload rejected', {
          presentationId: presentation.id,
          phase: 'receive',
        });
        throw Errors.NO_FILE_WAS_UPLOADED;
      }

      if (files.length !== 1) {
        sails.log.warn('Project presentation upload rejected', {
          presentationId: presentation.id,
          phase: 'validation',
        });
        throw Errors.INVALID_PRESENTATION_FILE;
      }

      const file = files[0];
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

      if (!inputs.resetSession && !Number.isInteger(inputs.keyVersion)) {
        sails.log.info('Project presentation upload skipped', {
          presentationId: presentation.id,
          phase: 'stale-session',
        });
        return exits.success({
          item: sails.helpers.projectPresentations.presentOne(presentation, true),
          stale: true,
        });
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

        const values = {
          documentData: {
            mimeType: PRESENTATION_MIME_TYPE,
            sizeInBytes: file.size,
            filename,
            preview: {
              status: 'pending',
              sourceFilename: filename,
            },
          },
        };

        if (inputs.resetSession) {
          Object.assign(values, {
            cryptpadEditKey: null,
            cryptpadViewKey: null,
            cryptpadKeyVersion: presentation.cryptpadKeyVersion + 1,
          });
        }

        const criteria = inputs.resetSession
          ? presentation.id
          : { id: presentation.id, cryptpadKeyVersion: inputs.keyVersion };
        updatedPresentation = await ProjectPresentation.qm.updateOne(criteria, values);

        if (!updatedPresentation) {
          if (inputs.resetSession) {
            throw Errors.PRESENTATION_NOT_FOUND;
          }

          const currentPresentation = await ProjectPresentation.qm.getOneById(presentation.id);
          if (!currentPresentation) {
            throw Errors.PRESENTATION_NOT_FOUND;
          }

          await discardUnpublishedFile();
          sails.log.info('Project presentation upload skipped', {
            presentationId: presentation.id,
            phase: 'stale-session',
          });
          return exits.success({
            item: sails.helpers.projectPresentations.presentOne(currentPresentation, true),
            stale: true,
          });
        }
      } catch (error) {
        sails.log.warn('Project presentation upload failed', {
          presentationId: presentation.id,
          phase: 'persistence',
        });
        await discardUnpublishedFile();
        throw error;
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
    } finally {
      await cleanupTemporaryFiles();
    }
  },
};
