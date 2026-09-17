/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const presenceRegistry = require('../../../utils/presence-registry');

const Errors = {
  SOCKET_REQUIRED: { socketRequired: 'Socket required' },
};

module.exports = {
  inputs: {
    status: {
      type: 'string',
      isIn: presenceRegistry.STATUSES,
      required: true,
    },
  },

  exits: {
    socketRequired: { responseType: 'badRequest' },
  },

  fn(inputs) {
    // Este pedido é também o que identifica o socket: o hook `current-user`
    // mete-o em `@user:<id>` antes de chegarmos aqui.
    if (!this.req.isSocket) {
      throw Errors.SOCKET_REQUIRED;
    }

    presenceRegistry.setReportedStatus(this.req.currentUser.id, inputs.status);

    // `force` porque quem acabou de ligar precisa de receber a lista mesmo que
    // mais ninguém tenha mudado de estado.
    sails.helpers.presence.broadcast.with({ force: true });

    return {};
  },
};
