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

    await Expense.destroyOne({
      id: expense.id,
    });

    return {
      item: expense,
    };
  },
};

