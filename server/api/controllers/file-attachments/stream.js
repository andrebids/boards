/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { prepareFileStream } = require('../../../utils/stream-file');

const Errors = {
  FILE_ATTACHMENT_NOT_FOUND: {
    fileAttachmentNotFound: 'File attachment not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    fileAttachmentNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const { attachment, board, project } = await sails.helpers.attachments
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.FILE_ATTACHMENT_NOT_FOUND);

    if (
      attachment.type !== Attachment.Types.FILE ||
      !attachment.data.video ||
      attachment.data.video.status !== 'ready' ||
      !attachment.data.video.playback
    ) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );
      if (!isProjectManager) {
        const boardMembership = await sails.models.boardmembership.qm.getOneByBoardIdAndUserId(
          board.id,
          currentUser.id,
        );
        if (!boardMembership) {
          throw Errors.FILE_ATTACHMENT_NOT_FOUND;
        }
      }
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    const path = `${sails.config.custom.attachmentsPathSegment}/${attachment.data.fileReferenceId}/video/${attachment.data.video.playback.filename}`;
    let prepared;
    try {
      prepared = await prepareFileStream({
        req: this.req,
        res: this.res,
        fileManager,
        path,
        contentType: attachment.data.video.playback.mimeType,
      });
    } catch (error) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    return prepared.handled ? exits.success() : exits.success(prepared.stream);
  },
};
