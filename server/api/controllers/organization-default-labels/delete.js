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
    console.log(`🔵 [CONTROLLER] DELETE /api/organization-default-labels/${inputs.id}`);
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const label = await sails.models.organizationdefaultlabel.qm.deleteOne(inputs.id);

    if (!label) {
      console.log(`🔴 [CONTROLLER] Label ${inputs.id} não encontrado`);
      throw Errors.LABEL_NOT_FOUND;
    }

    console.log(`✅ [CONTROLLER] Label ${inputs.id} eliminado`);
    
    // Auditoria: registar eliminação
    sails.log.warn(`[AUDIT] User ${currentUser.email} (${currentUser.id}) deleted default label "${label.name}" (${label.id})`);

    // Broadcast para admins
    const admins = await User.find({
      or: [
        { role: User.Roles.ADMIN },
        { role: User.Roles.PROJECT_OWNER },
      ],
    });

    admins.forEach((admin) => {
      sails.sockets.broadcast(
        `user:${admin.id}`,
        'organizationDefaultLabelDelete',
        { item: label }
      );
    });

    return { item: label };
  },
};

