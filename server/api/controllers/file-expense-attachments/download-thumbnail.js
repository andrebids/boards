/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  FILE_ATTACHMENT_NOT_FOUND: {
    fileAttachmentNotFound: 'File expense attachment not found',
  },
};

const FILE_NAMES = ['outside-360', 'outside-720'];

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    fileName: {
      type: 'string',
      isIn: FILE_NAMES,
      required: true,
    },
    fileExtension: {
      type: 'string',
      maxLength: 128,
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

    const attachment = await ExpenseAttachment.findOne({ id: inputs.id });
    if (!attachment || attachment.type !== ExpenseAttachment.Types.FILE) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    if (!attachment.data.image) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    if (inputs.fileExtension !== attachment.data.image.thumbnailsExtension) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    const expense = await Expense.findOne({ id: attachment.expenseId });
    if (!expense) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(expense.projectId);
    if (!project) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;
    if (!isFinanceMember && !isAdmin) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND; // Forbidden
    }

    const fileManager = sails.hooks['file-manager'].getInstance();

    let readStream;
    try {
      readStream = await fileManager.streamByPath(
        `${sails.config.custom.attachmentsPathSegment}/${attachment.data.fileReferenceId}/thumbnails/${inputs.fileName}.${inputs.fileExtension}`,
      );
    } catch (error) {
      throw Errors.FILE_ATTACHMENT_NOT_FOUND;
    }

    this.res.type(attachment.data.mimeType);
    this.res.set('Cache-Control', 'private, max-age=900');

    return exits.success(readStream);
  },
};


