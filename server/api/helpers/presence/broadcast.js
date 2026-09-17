/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const presenceRegistry = require('../../../utils/presence-registry');

const USER_ROOM_PREFIX = '@user:';

// Cada socket autenticado entra em `@user:<id>` (hook `current-user`), por isso as
// salas já são o registo de quem está ligado -- não é preciso guardar sockets.
const getConnectedUserIds = () =>
  [...sails.io.sockets.adapter.rooms.keys()]
    .filter((room) => room.startsWith(USER_ROOM_PREFIX))
    .map((room) => room.slice(USER_ROOM_PREFIX.length));

module.exports = {
  sync: true,

  inputs: {
    force: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  fn(inputs) {
    const snapshot = presenceRegistry.computeSnapshot(getConnectedUserIds());
    const isChanged = presenceRegistry.hasChanged(snapshot);

    if (!inputs.force && !isChanged) {
      return false;
    }

    presenceRegistry.commit(snapshot);

    // Vai a lista inteira, não as diferenças: um cliente que perca um evento
    // corrige-se no seguinte.
    sails.sockets.blast('userPresenceUpdate', {
      item: {
        presences: snapshot,
      },
    });

    if (isChanged) {
      sails.log.info('[PRESENCE]', snapshot);
    }

    return true;
  },
};
