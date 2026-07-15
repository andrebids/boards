/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, delay, join, put, race, select, spawn, take } from 'redux-saga/effects';

import selectors from '../../selectors';
import entryActions from '../../entry-actions';
import ErrorCodes from '../../constants/ErrorCodes';

let lastRequestTask;
const PREVIOUS_REQUEST_WAIT_TIMEOUT = 30000;

function* queueRequest(previousRequestTask, method, ...args) {
  if (previousRequestTask) {
    try {
      yield race({
        completed: join(previousRequestTask),
        timeout: delay(PREVIOUS_REQUEST_WAIT_TIMEOUT),
      });
    } catch {
      /* empty */
    }
  }

  const accessToken = yield select(selectors.selectAccessToken);

  try {
    return yield call(method, ...args, {
      Authorization: `Bearer ${accessToken}`,
    });
  } catch (error) {
    if (error.code === ErrorCodes.UNAUTHORIZED) {
      yield put(entryActions.logout(false));
      yield take();
    }

    throw error;
  }
}

export default function* request(method, ...args) {
  const previousRequestTask = lastRequestTask;
  lastRequestTask = yield spawn(queueRequest, previousRequestTask, method, ...args);

  return yield join(lastRequestTask);
}
