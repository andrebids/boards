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
  inputs: {
    order: {
      type: 'json',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value)) return false;
        return value.every(item => 
          (typeof item.id === 'string' || typeof item.id === 'number') && 
          typeof item.position === 'number'
        );
      },
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    await sails.models.organizationdefaultlabel.qm.reorder(inputs.order);

    const labels = await sails.models.organizationdefaultlabel.qm.getAll();

    // Broadcast para admins (otimizado)
    await sails.helpers.organizationDefaultLabels.broadcastToAdmins(
      'organizationDefaultLabelsReorder',
      { items: labels }
    );

    return { items: labels };
  },
};

