/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  EXPENSE_NOT_FOUND: {
    expenseNotFound: 'Expense not found',
  },
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  NO_FILE_WAS_UPLOADED: {
    noFileWasUploaded: 'No file was uploaded',
  },
  INVALID_FILE_TYPE: {
    invalidFileType: 'Only PDF or image files are allowed',
  },
};

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
  },

  exits: {
    expenseNotFound: {
      responseType: 'notFound',
    },
    notEnoughRights: {
      responseType: 'forbidden',
    },
    noFileWasUploaded: {
      responseType: 'unprocessableEntity',
    },
    invalidFileType: {
      responseType: 'unprocessableEntity',
    },
    uploadError: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    sails.log.info('[EXPENSE-ATTACHMENTS][CREATE] start', { expenseId: inputs.id, name: inputs.name, userId: currentUser && currentUser.id });

    const expense = await Expense.findOne({ id: inputs.id });
    if (!expense) {
      sails.log.warn('[EXPENSE-ATTACHMENTS][CREATE] expense not found', { expenseId: inputs.id });
      throw Errors.EXPENSE_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(expense.projectId);
    if (!project) {
      sails.log.warn('[EXPENSE-ATTACHMENTS][CREATE] project not found for expense', { expenseId: expense.id, projectId: expense.projectId });
      throw Errors.EXPENSE_NOT_FOUND;
    }

    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;
    if (!isFinanceMember && !isAdmin) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let files;
    try {
      files = await sails.helpers.utils.receiveFile('file', this.req);
      sails.log.info('[EXPENSE-ATTACHMENTS][CREATE] files received', { count: files && files.length });
    } catch (error) {
      sails.log.error('[EXPENSE-ATTACHMENTS][CREATE] receiveFile error', { error: error && error.message });
      return exits.uploadError(error.message);
    }

    if (!files || files.length === 0) {
      sails.log.warn('[EXPENSE-ATTACHMENTS][CREATE] no file was uploaded');
      throw Errors.NO_FILE_WAS_UPLOADED;
    }

    const file = _.last(files);
    sails.log.verbose('[EXPENSE-ATTACHMENTS][CREATE] processing file', { filename: file && file.filename, type: file && file.type, size: file && file.size });

    // Validar MIME
    if (!ALLOWED_MIME.has(file.type)) {
      sails.log.warn('[EXPENSE-ATTACHMENTS][CREATE] invalid MIME type', { type: file && file.type });
      throw Errors.INVALID_FILE_TYPE;
    }

    const data = await sails.helpers.attachments.processUploadedFile(file);
    sails.log.verbose('[EXPENSE-ATTACHMENTS][CREATE] processed file', { data });

    const values = {
      type: ExpenseAttachment.Types.FILE,
      name: inputs.name,
      data,
      expenseId: expense.id,
      creatorUserId: currentUser.id,
    };

    const attachment = await ExpenseAttachment.create(values).fetch();
    sails.log.info('[EXPENSE-ATTACHMENTS][CREATE] created', { attachmentId: attachment && attachment.id });

    return exits.success({
      item: {
        ...attachment,
        data: {
          ..._.omit(attachment.data, ['fileReferenceId', 'filename', 'image.thumbnailsExtension']),
          url: `${sails.config.custom.baseUrl}/expense-attachments/${attachment.id}/download/${attachment.data.filename}`,
          thumbnailUrls:
            attachment.data && attachment.data.image && attachment.data.image.thumbnailsExtension
              ? {
                  outside360: `${sails.config.custom.baseUrl}/expense-attachments/${attachment.id}/download/thumbnails/outside-360.${attachment.data.image.thumbnailsExtension}`,
                  outside720: `${sails.config.custom.baseUrl}/expense-attachments/${attachment.id}/download/thumbnails/outside-720.${attachment.data.image.thumbnailsExtension}`,
                }
              : null,
        },
      },
    });
  },
};


