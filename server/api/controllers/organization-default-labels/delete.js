/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LABEL_NOT_FOUND: {
    labelNotFound: 'Label not found',
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
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const label = await sails.models.organizationdefaultlabel.qm.deleteOne(inputs.id);

    if (!label) {
      throw Errors.LABEL_NOT_FOUND;
    }

    // Auditoria: registar eliminação
    sails.log.warn(`[AUDIT] User ${currentUser.email} (${currentUser.id}) deleted default label "${label.name}" (${label.id})`);

    // Broadcast para admins (otimizado)
    await sails.helpers.organizationDefaultLabels.broadcastToAdmins(
      'organizationDefaultLabelDelete',
      { item: label }
    );

    return { item: label };
  },
};

