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
    projectId: {
      ...idInput,
      required: true,
    },
    category: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
      required: true,
    },
    value: {
      type: 'number',
      required: true,
    },
    date: {
      type: 'string',
      required: true,
    },
    status: {
      type: 'string',
      isIn: ['paid', 'pending'],
      required: true,
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

    console.log('=== CREATE EXPENSE ===');
    console.log('Inputs:', inputs);
    console.log('Current User:', currentUser.id);

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      console.log('ERROR: Project not found:', inputs.projectId);
      throw Errors.PROJECT_NOT_FOUND;
    }

    console.log('Project found:', project.id);

    // Verificar se user tem permissão (apenas Finance Members ou Admins Globais)
    const isFinanceMember = await sails.helpers.finance.isMember(project.id, currentUser.id);
    const isAdmin = currentUser.role === User.Roles.ADMIN;

    console.log('User is finance member:', isFinanceMember);
    console.log('User is admin:', isAdmin);

    if (!isFinanceMember && !isAdmin) {
      console.log('ERROR: User is not a finance member or admin');
      throw Errors.NOT_FINANCE_MEMBER;
    }

    const expense = await Expense.create({
      projectId: project.id,
      userId: currentUser.id,
      category: inputs.category,
      description: inputs.description,
      value: inputs.value,
      date: inputs.date,
      status: inputs.status,
    }).fetch();

    console.log('Expense created:', expense);

    return {
      item: expense,
    };
  },
};

