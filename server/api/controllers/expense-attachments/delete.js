/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  ATTACHMENT_NOT_FOUND: {
    attachmentNotFound: 'Expense attachment not found',
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
    attachmentNotFound: {
      responseType: 'notFound',
    },
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const attachment = await ExpenseAttachment.findOne({ id: inputs.id });
    if (!attachment) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    const expense = await Expense.findOne({ id: attachment.expenseId });
    if (!expense) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(expense.projectId);
    if (!project) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;
    if (!isFinanceMember && !isAdmin) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const isFile = attachment.type === ExpenseAttachment.Types.FILE;

    let deleted;
    await sails.getDatastore().transaction(async (db) => {
      deleted = await ExpenseAttachment.destroy({ id: attachment.id }).fetch().usingConnection(db);

      if (isFile && deleted.length > 0) {
        const { data } = deleted[0];
        if (data && data.fileReferenceId) {
          // reduzir/limpar file_reference como em attachments
          const fileReference = await FileReference.findOne({ id: data.fileReferenceId }).usingConnection(db);
          if (fileReference) {
            if (fileReference.total === null || fileReference.total <= 1) {
              await FileReference.destroy({ id: fileReference.id }).usingConnection(db);
              await sails.helpers.attachments.removeUnreferencedFiles(fileReference);
            } else {
              await FileReference.updateOne({ id: fileReference.id }).set({
                total: fileReference.total - 1,
                updatedAt: new Date().toISOString(),
              }).usingConnection(db);
            }
          }
        }
      }
    });

    return {
      item: deleted && deleted[0] ? deleted[0] : null,
    };
  },
};


