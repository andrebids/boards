/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Types = {
  FILE: 'file',
};

module.exports = {
  Types,

  attributes: {
    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },
    data: {
      type: 'json',
      required: true,
    },
    name: {
      type: 'string',
      required: true,
    },

    expenseId: {
      model: 'Expense',
      required: true,
      columnName: 'expense_id',
    },
    creatorUserId: {
      model: 'User',
      columnName: 'creator_user_id',
    },
  },

  tableName: 'expense_attachment',
};


