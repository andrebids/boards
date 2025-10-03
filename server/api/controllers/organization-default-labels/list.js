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
    const { currentUser } = this.req;

    // Verificar se é Admin ou ProjectOwner
    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const labels = await sails.models.organizationdefaultlabel.qm.getAll();

    return {
      items: labels,
    };
  },
};

