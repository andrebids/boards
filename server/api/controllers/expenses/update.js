/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  EXPENSE_NOT_FOUND: {
    expenseNotFound: 'Expense not found',
  },
  NOT_FINANCE_MEMBER: {
    notFinanceMember: 'Not a finance member',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    category: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    value: {
      type: 'number',
    },
    date: {
      type: 'string',
    },
    status: {
      type: 'string',
      isIn: ['paid', 'pending'],
    },
  },

  exits: {
    expenseNotFound: {
      responseType: 'notFound',
    },
    notFinanceMember: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const expense = await Expense.findOne({
      id: inputs.id,
    });

    if (!expense) {
      throw Errors.EXPENSE_NOT_FOUND;
    }

    // Verificar se user tem permissão
    const hasAccess = await sails.helpers.finance.isMemberOrManager(
      expense.projectId,
      currentUser.id,
    );

    if (!hasAccess) {
      throw Errors.NOT_FINANCE_MEMBER;
    }

    const updates = {};
    if (inputs.category !== undefined) {
      updates.category = inputs.category;
    }
    if (inputs.description !== undefined) {
      updates.description = inputs.description;
    }
    if (inputs.value !== undefined) {
      updates.value = inputs.value;
    }
    if (inputs.date !== undefined) {
      updates.date = inputs.date;
    }
    if (inputs.status !== undefined) {
      updates.status = inputs.status;
    }

    const updatedExpense = await Expense.updateOne({
      id: expense.id,
    }).set(updates);

    return {
      item: updatedExpense,
    };
  },
};

