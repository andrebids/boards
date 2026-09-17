/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

// Só por socket: este pedido é também o que identifica a ligação no servidor.
const updatePresence = (status, headers) =>
  socket.post('/presence', { status }, headers);

export default {
  updatePresence,
};
