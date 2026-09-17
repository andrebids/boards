/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, fork, takeLatest } from 'redux-saga/effects';

import services from '../services';
import ActionTypes from '../../../constants/ActionTypes';

export default function* presenceWatchers() {
  yield all([
    fork(services.trackPresence),
    // A reconexão apaga os utilizadores do ORM; voltar a anunciar-nos faz o
    // servidor difundir a lista completa outra vez.
    takeLatest(ActionTypes.SOCKET_RECONNECT_HANDLE, () =>
      services.reportCurrentPresence()
    ),
  ]);
}
