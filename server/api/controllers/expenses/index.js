/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
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
    status: {
      type: 'string',
    },
    startDate: {
      type: 'string',
    },
    endDate: {
      type: 'string',
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    notFinanceMember: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.id);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    // Verificar se user tem permissão (apenas Finance Members ou Admins Globais)
    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;

    if (!isFinanceMember && !isAdmin) {
      throw Errors.NOT_FINANCE_MEMBER;
    }

    // Construir filtros
    const criteria = {
      projectId: project.id,
    };

    if (inputs.category) {
      criteria.category = inputs.category;
    }

    if (inputs.status) {
      criteria.status = inputs.status;
    }

    if (inputs.startDate || inputs.endDate) {
      criteria.date = {};
      if (inputs.startDate) {
        criteria.date['>='] = inputs.startDate;
      }
      if (inputs.endDate) {
        criteria.date['<='] = inputs.endDate;
      }
    }

    // Buscar despesas
    const expenses = await Expense.find(criteria).sort('date DESC');

    // Buscar users relacionados
    const userIds = [...new Set(expenses.map((exp) => exp.userId))];
    const users = await User.qm.getByIds(userIds);

    return {
      items: expenses,
      included: {
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
  },
};

