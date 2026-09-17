/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { buffers, eventChannel } from 'redux-saga';
import { call, cancelled, take } from 'redux-saga/effects';

import request from '../request';
import api from '../../../api';
import createPresenceTracker from '../../../utils/presence-tracker';
import ActionTypes from '../../../constants/ActionTypes';
import { PresenceStatuses } from '../../../constants/Enums';

let currentStatus = PresenceStatuses.ONLINE;

const createPresenceChannel = () =>
  eventChannel(emit => {
    const tracker = createPresenceTracker({
      onChange: emit,
    });

    tracker.start();

    return () => {
      tracker.stop();
    };
    // Buffer de 1: o primeiro estado é emitido ainda dentro do `start()` acima,
    // antes de a saga estar à espera, e só o mais recente interessa.
  }, buffers.sliding(1));

export function* reportPresence(status) {
  currentStatus = status;

  try {
    yield call(request, api.updatePresence, status);
  } catch {
    // A presença é acessória: uma falha corrige-se na mudança de estado seguinte
    // ou na próxima reconexão.
  }
}

export function* reportCurrentPresence() {
  yield call(reportPresence, currentStatus);
}

export function* trackPresence() {
  // Só depois do arranque: aí o socket está ligado e autenticado, e é este
  // primeiro pedido que nos regista como online no servidor.
  yield take(ActionTypes.CORE_INITIALIZE);

  const presenceChannel = yield call(createPresenceChannel);

  try {
    while (true) {
      const status = yield take(presenceChannel);
      yield call(reportPresence, status);
    }
  } finally {
    if (yield cancelled()) {
      presenceChannel.close();
    }
  }
}

export default {
  reportPresence,
  reportCurrentPresence,
  trackPresence,
};
