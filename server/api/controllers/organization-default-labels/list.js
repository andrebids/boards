/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  inputs: {},

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn() {
    console.log('🔵 [CONTROLLER] GET /api/organization-default-labels/list');
    const { currentUser } = this.req;

    console.log(`🔵 [CONTROLLER] User: ${currentUser.name} (${currentUser.email}) Role: ${currentUser.role}`);
    // Verificar se é Admin ou ProjectOwner
    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado: utilizador não é Admin/ProjectOwner');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const labels = await sails.models.organizationdefaultlabel.qm.getAll();

    console.log(`✅ [CONTROLLER] A retornar ${labels.length} labels`);
    return {
      items: labels,
    };
  },
};

