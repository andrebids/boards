/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  NOT_PROJECT_MANAGER: {
    notProjectManager: 'Not a project manager',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  USER_ALREADY_FINANCE_MEMBER: {
    userAlreadyFinanceMember: 'User already finance member',
  },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    userId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    notProjectManager: {
      responseType: 'forbidden',
    },
    userNotFound: {
      responseType: 'notFound',
    },
    userAlreadyFinanceMember: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    // Apenas project managers podem adicionar finance members
    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      project.id,
    );

    if (!isProjectManager && currentUser.role !== User.Roles.ADMIN) {
      throw Errors.NOT_PROJECT_MANAGER;
    }

    const user = await User.qm.getOneById(inputs.userId, {
      withDeactivated: false,
    });

    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    // Verificar se já é member
    const existing = await FinanceMember.findOne({
      projectId: project.id,
      userId: user.id,
    });

    if (existing) {
      throw Errors.USER_ALREADY_FINANCE_MEMBER;
    }

    const financeMember = await FinanceMember.create({
      projectId: project.id,
      userId: user.id,
    }).fetch();

    return {
      item: financeMember,
      included: {
        users: [sails.helpers.users.presentOne(user, currentUser)],
      },
    };
  },
};

