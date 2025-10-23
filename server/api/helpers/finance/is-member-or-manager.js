/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      required: true,
    },
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    // Verificar se é finance member
    const isFinanceMember = await sails.helpers.finance.isMember(
      inputs.projectId,
      inputs.userId,
    );

    if (isFinanceMember) {
      return true;
    }

    // Verificar se é project manager
    const isProjectManager = await ProjectManager.count({
      projectId: inputs.projectId,
      userId: inputs.userId,
    });

    return isProjectManager > 0;
  },
};

