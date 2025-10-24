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
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
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
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    sails.log.verbose('[EXPENSE-ATTACHMENTS][INDEX] list for expense', { expenseId: inputs.id, userId: currentUser && currentUser.id });

    const expense = await Expense.findOne({ id: inputs.id });
    if (!expense) {
      throw Errors.EXPENSE_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(expense.projectId);
    if (!project) {
      throw Errors.EXPENSE_NOT_FOUND;
    }

    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;
    if (!isFinanceMember && !isAdmin) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const attachments = await ExpenseAttachment.find({ expenseId: expense.id }).sort('createdAt DESC');
    sails.log.verbose('[EXPENSE-ATTACHMENTS][INDEX] found', { count: attachments.length });

    const items = attachments.map((attachment) => ({
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
    }));

    return { items };
  },
};


