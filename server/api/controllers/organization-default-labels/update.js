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
  LABEL_ALREADY_EXISTS: {
    labelAlreadyExists: 'Label already exists',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 60,
    },
    color: {
      type: 'string',
      isIn: require('../../models/Label').COLORS,
    },
    position: {
      type: 'number',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelNotFound: {
      responseType: 'notFound',
    },
    labelAlreadyExists: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    console.log('🔵 [CONTROLLER] PATCH /api/organization-default-labels/update', inputs);
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    try {
      const values = {};
      if (inputs.name !== undefined) {
        // Sanitizar o nome para prevenir XSS
        const sanitizedName = inputs.name.trim()
          .replace(/[<>]/g, '') // Remove caracteres HTML perigosos
          .substring(0, 60); // Garantir máximo de 60 caracteres
        
        if (!sanitizedName) {
          throw new Error('Label name cannot be empty after sanitization');
        }
        values.name = sanitizedName;
      }
      if (inputs.color !== undefined) values.color = inputs.color;
      if (inputs.position !== undefined) values.position = inputs.position;

      const label = await sails.models.organizationdefaultlabel.qm.updateOne(inputs.id, values);

      if (!label) {
        console.log(`🔴 [CONTROLLER] Label ${inputs.id} não encontrado`);
        throw Errors.LABEL_NOT_FOUND;
      }

      console.log(`✅ [CONTROLLER] Label ${inputs.id} atualizado`);

      // Broadcast para admins (otimizado)
      await sails.helpers.organizationDefaultLabels.broadcastToAdmins(
        'organizationDefaultLabelUpdate',
        { item: label }
      );

      return { item: label };
    } catch (error) {
      if (error.message?.includes('already exists')) {
        throw Errors.LABEL_ALREADY_EXISTS;
      }
      if (error === Errors.LABEL_NOT_FOUND) {
        throw error;
      }
      throw error;
    }
  },
};

