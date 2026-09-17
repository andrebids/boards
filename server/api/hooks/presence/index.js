/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * presence hook
 *
 * @description :: Varre periodicamente as salas `@user:` para detetar quem saiu.
 *                 Não há evento de disconnect nesta aplicação, por isso a saída
 *                 é detetada por sondagem, como no hook `watcher`.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const POLL_INTERVAL_MILLISECONDS = 10 * 1000;

module.exports = function definePresenceHook(sails) {
  let interval;

  const broadcastPresenceChanges = () => {
    try {
      sails.helpers.presence.broadcast();
    } catch (error) {
      sails.log.error('[PRESENCE][POLL_ERROR]', error);
    }
  };

  return {
    initialize() {
      sails.log.info('Initializing custom hook (`presence`)');

      interval = setInterval(broadcastPresenceChanges, POLL_INTERVAL_MILLISECONDS);
    },

    teardown(done) {
      clearInterval(interval);
      done();
    },
  };
};
