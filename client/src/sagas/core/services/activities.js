/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';

export function* fetchActivitiesInBoard(boardId) {
  const { lastActivityId } = yield select(selectors.selectBoardById, boardId);

  yield put(actions.fetchActivitiesInBoard(boardId));

  let activities;
  let users;

  try {
    ({
      items: activities,
      included: { users },
    } = yield call(request, api.getActivitiesInBoard, boardId, {
      beforeId: lastActivityId || undefined,
    }));
  } catch (error) {
    console.error('❌ [SAGA-ACTIVITIES] Erro ao carregar atividades:', error.message);
    yield put(actions.fetchActivitiesInBoard.failure(boardId, error));
    return;
  }

  yield put(actions.fetchActivitiesInBoard.success(boardId, activities, users));
}

export function* fetchActivitiesInCurrentBoard() {
  const { boardId } = yield select(selectors.selectPath);
  yield call(fetchActivitiesInBoard, boardId);
}

export function* fetchActivitiesInCard(cardId) {
  const card = yield select(selectors.selectCardById, cardId);
  
  // Verificar se o card existe antes de prosseguir
  if (!card) {
    console.warn(`❌ [SAGA-ACTIVITIES] Card não encontrado: ${cardId}`);
    return;
  }

  const { lastActivityId } = card;

  yield put(actions.fetchActivitiesInCard(cardId));

  let activities;
  let users;

  try {
    ({
      items: activities,
      included: { users },
    } = yield call(request, api.getActivitiesInCard, cardId, {
      beforeId: lastActivityId || undefined,
    }));
  } catch (error) {
    console.error('❌ [SAGA-ACTIVITIES] Erro ao carregar atividades do card:', error.message);
    yield put(actions.fetchActivitiesInCard.failure(cardId, error));
    return;
  }

  yield put(actions.fetchActivitiesInCard.success(cardId, activities, users));
}

export function* fetchActivitiesInCurrentCard() {
  const { cardId } = yield select(selectors.selectPath);

  // Verificar se há um cardId válido antes de prosseguir
  if (!cardId) {
    console.warn('❌ [SAGA-ACTIVITIES] Nenhum card selecionado para buscar atividades');
    return;
  }

  yield call(fetchActivitiesInCard, cardId);
}

export function* handleActivityCreate(activity) {
  yield put(actions.handleActivityCreate(activity));
}

export default {
  fetchActivitiesInBoard,
  fetchActivitiesInCurrentBoard,
  fetchActivitiesInCard,
  fetchActivitiesInCurrentCard,
  handleActivityCreate,
};
