/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const path = require('path');
const { rimraf } = require('rimraf');

const { isUrl } = require('../../../utils/validators');
const { idInput } = require('../../../utils/inputs');
const { isVideoFile } = require('../../../utils/video-file');

const bytesToMiB = (bytes) => Math.floor(bytes / (1024 * 1024));

const isDesignFile = (filename) =>
  ['.ai', '.eps', '.psd'].includes(path.extname(filename || '').toLowerCase());
const isArchiveFile = (filename) =>
  ['.rar', '.zip'].includes(path.extname(filename || '').toLowerCase());

const getUploadLimit = (filename) => {
  if (isDesignFile(filename)) {
    return sails.config.custom.designAttachmentMaxBytes;
  }
  if (isVideoFile(filename)) {
    return sails.config.custom.videoAttachmentMaxBytes;
  }
  if (isArchiveFile(filename)) {
    return sails.config.custom.archiveAttachmentMaxBytes;
  }

  return sails.config.custom.attachmentMaxBytes;
};

const getFileTypeLabel = (filename) => {
  if (isDesignFile(filename)) {
    return 'ficheiro de design';
  }
  if (isVideoFile(filename)) {
    return 'vídeo';
  }
  if (isArchiveFile(filename)) {
    return 'ficheiro comprimido';
  }

  return 'ficheiro';
};

const discardFiles = (files) => Promise.allSettled(files.map(({ fd }) => rimraf(fd)));

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  NO_FILE_WAS_UPLOADED: {
    noFileWasUploaded: 'No file was uploaded',
  },
  URL_MUST_BE_PRESENT: {
    urlMustBePresent: 'Url must be present',
  },
};

module.exports = {
  inputs: {
    cardId: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      isIn: Object.values(Attachment.Types),
      required: true,
    },
    url: {
      type: 'string',
      maxLength: 2048,
      custom: isUrl,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    requestId: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
    },
    skipCover: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    noFileWasUploaded: {
      responseType: 'unprocessableEntity',
    },
    uploadError: {
      responseType: 'unprocessableEntity',
    },
    urlMustBePresent: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;

    const { card, list, board, project } = await sails.helpers.cards
      .getPathToProjectById(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const boardMembership = await sails.models.boardmembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let data;
    if (inputs.type === Attachment.Types.FILE) {
      let files;
      try {
        files = await sails.helpers.utils.receiveFile.with({
          paramName: 'file',
          req: this.req,
          maxBytes: Math.max(
            sails.config.custom.attachmentMaxBytes,
            sails.config.custom.designAttachmentMaxBytes,
            sails.config.custom.videoAttachmentMaxBytes,
            sails.config.custom.archiveAttachmentMaxBytes,
          ),
        });
      } catch (error) {
        if (error.code === 'E_EXCEEDS_UPLOAD_LIMIT') {
          return exits.uploadError(
            `O ficheiro excede o limite máximo de ${bytesToMiB(
              Math.max(
                sails.config.custom.designAttachmentMaxBytes,
                sails.config.custom.videoAttachmentMaxBytes,
                sails.config.custom.archiveAttachmentMaxBytes,
              ),
            )} MB.`,
          );
        }

        return exits.uploadError(error.message || 'Não foi possível receber o ficheiro.');
      }

      if (files.length === 0) {
        throw Errors.NO_FILE_WAS_UPLOADED;
      }

      const file = _.last(files);
      const uploadLimit = getUploadLimit(file.filename);
      if (Number.isFinite(file.size) && file.size > uploadLimit) {
        await discardFiles(files);

        const fileTypeLabel = getFileTypeLabel(file.filename);
        return exits.uploadError(
          `O ${fileTypeLabel} não pode ter mais de ${bytesToMiB(uploadLimit)} MB.`,
        );
      }

      data = await sails.helpers.attachments.processUploadedFile(file);
    } else if (inputs.type === Attachment.Types.LINK) {
      if (!inputs.url) {
        throw Errors.URL_MUST_BE_PRESENT;
      }

      data = await sails.helpers.attachments.processLink(inputs.url);
    }

    const values = {
      ..._.pick(inputs, ['type', 'name']),
      data,
    };

    const attachment = await sails.helpers.attachments.createOne.with({
      project,
      board,
      list,
      values: {
        ...values,
        card,
        creatorUser: currentUser,
      },
      requestId: inputs.requestId,
      skipCover: inputs.skipCover,
      request: this.req,
    });

    return exits.success({
      item: sails.helpers.attachments.presentOne(attachment),
    });
  },
};
