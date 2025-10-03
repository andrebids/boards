/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const MAX_DEFAULT_LABELS = 50; // Limite máximo de etiquetas padrão

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LABEL_ALREADY_EXISTS: {
    labelAlreadyExists: 'Label already exists',
  },
  TOO_MANY_LABELS: {
    tooManyLabels: 'Maximum number of default labels reached',
  },
};

module.exports = {
  inputs: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 60,
    },
    color: {
      type: 'string',
      required: true,
      isIn: require('../../models/Label').COLORS,
    },
    position: {
      type: 'number',
      defaultsTo: 0,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelAlreadyExists: {
      responseType: 'conflict',
    },
    tooManyLabels: {
      responseType: 'badRequest',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    // Verificar limite de etiquetas
    const existingLabels = await sails.models.organizationdefaultlabel.qm.getAll();
    if (existingLabels.length >= MAX_DEFAULT_LABELS) {
      throw Errors.TOO_MANY_LABELS;
    }

    try {
      // Sanitizar o nome para prevenir XSS
      const sanitizedName = inputs.name.trim()
        .replace(/[<>]/g, '') // Remove caracteres HTML perigosos
        .substring(0, 60); // Garantir máximo de 60 caracteres

      if (!sanitizedName) {
        throw new Error('Label name cannot be empty after sanitization');
      }

      const label = await sails.models.organizationdefaultlabel.qm.createOne({
        name: sanitizedName,
        color: inputs.color,
        position: inputs.position,
      });

      // Auditoria: registar criação
      sails.log.info(`[AUDIT] User ${currentUser.email} (${currentUser.id}) created default label "${label.name}" (${label.id})`);

      // Broadcast para admins (otimizado)
      await sails.helpers.organizationDefaultLabels.broadcastToAdmins(
        'organizationDefaultLabelCreate',
        { item: label }
      );

      return { item: label };
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw Errors.LABEL_ALREADY_EXISTS;
      }
      throw error;
    }
  },
};

