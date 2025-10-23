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

    // Verificar se user tem permissão (finance member OU project manager)
    const hasAccess = await sails.helpers.finance.isMemberOrManager(project.id, currentUser.id);

    if (!hasAccess) {
      throw Errors.NOT_FINANCE_MEMBER;
    }

    // Buscar ou criar configuração financeira
    let projectFinance = await ProjectFinance.findOne({
      projectId: project.id,
    });

    if (!projectFinance) {
      projectFinance = await ProjectFinance.create({
        projectId: project.id,
        budget: 0.0,
        currency: 'EUR',
      }).fetch();
    }

    // Buscar membros do finance panel
    const financeMembers = await FinanceMember.find({
      projectId: project.id,
    }).populate('userId');

    // Buscar estatísticas
    const stats = await sails.helpers.finance.getStats(project.id);

    // Calcular balance
    const balance = parseFloat(projectFinance.budget) - stats.totalExpenses;

    return {
      item: {
        ...projectFinance,
        balance,
        stats,
      },
      included: {
        financeMembers,
      },
    };
  },
};

