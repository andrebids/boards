/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  FINANCE_MEMBER_NOT_FOUND: {
    financeMemberNotFound: 'Finance member not found',
  },
  NOT_PROJECT_MANAGER: {
    notProjectManager: 'Not a project manager',
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
    financeMemberNotFound: {
      responseType: 'notFound',
    },
    notProjectManager: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const financeMember = await FinanceMember.findOne({
      id: inputs.id,
    });

    if (!financeMember) {
      throw Errors.FINANCE_MEMBER_NOT_FOUND;
    }

    // Apenas project managers podem remover finance members
    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      financeMember.projectId,
    );

    if (!isProjectManager && currentUser.role !== User.Roles.ADMIN) {
      throw Errors.NOT_PROJECT_MANAGER;
    }

    await FinanceMember.destroyOne({
      id: financeMember.id,
    });

    return {
      item: financeMember,
    };
  },
};

