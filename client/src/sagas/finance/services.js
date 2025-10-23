/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put } from 'redux-saga/effects';

import request from '../core/request';
import api from '../../api';
import actions from '../../actions';

export function* fetchFinanceConfig(projectId) {
  try {
    const { item, included } = yield call(request, api.finance.getFinanceConfig, projectId);

    yield put(
      actions.fetchFinanceConfig.success(item, included.financeMembers || []),
    );
  } catch (error) {
    yield put(actions.fetchFinanceConfig.failure(error));
  }
}

export function* updateFinanceConfig(projectId, data) {
  try {
    const { item } = yield call(request, api.finance.updateFinanceConfig, projectId, data);

    yield put(actions.updateFinanceConfig.success(item));
  } catch (error) {
    yield put(actions.updateFinanceConfig.failure(error));
  }
}

export function* addFinanceMember(projectId, userId) {
  try {
    const { item, included } = yield call(
      request,
      api.finance.addFinanceMember,
      projectId,
      userId,
    );

    const user = included.users && included.users[0];

    yield put(actions.addFinanceMember.success(item, user));
  } catch (error) {
    yield put(actions.addFinanceMember.failure(error));
  }
}

export function* removeFinanceMember(memberId) {
  try {
    yield call(request, api.finance.removeFinanceMember, memberId);

    yield put(actions.removeFinanceMember.success(memberId));
  } catch (error) {
    yield put(actions.removeFinanceMember.failure(error));
  }
}

export function* fetchExpenses(projectId, filters) {
  try {
    const { items } = yield call(request, api.finance.getExpenses, projectId, filters);

    yield put(actions.fetchExpenses.success(items || []));
  } catch (error) {
    yield put(actions.fetchExpenses.failure(error));
  }
}

export function* createExpense(projectId, data) {
  try {
    console.log('SAGA: Creating expense', { projectId, data });
    const { item } = yield call(request, api.finance.createExpense, projectId, data);

    console.log('SAGA: Expense created successfully', item);
    yield put(actions.createExpense.success(item));

    // Atualizar estatísticas
    yield call(fetchExpenseStats, projectId);
  } catch (error) {
    console.error('SAGA: Error creating expense', error);
    yield put(actions.createExpense.failure(error));
  }
}

export function* updateExpense(expenseId, data) {
  try {
    const { item } = yield call(request, api.finance.updateExpense, expenseId, data);

    yield put(actions.updateExpense.success(item));

    // Atualizar estatísticas
    if (item && item.projectId) {
      yield call(fetchExpenseStats, item.projectId);
    }
  } catch (error) {
    yield put(actions.updateExpense.failure(error));
  }
}

export function* deleteExpense(expenseId, projectId) {
  try {
    yield call(request, api.finance.deleteExpense, expenseId);

    yield put(actions.deleteExpense.success(expenseId));

    // Atualizar estatísticas
    if (projectId) {
      yield call(fetchExpenseStats, projectId);
    }
  } catch (error) {
    yield put(actions.deleteExpense.failure(error));
  }
}

export function* fetchExpenseStats(projectId) {
  try {
    const { item } = yield call(request, api.finance.getExpenseStats, projectId);

    yield put(actions.fetchExpenseStats.success(item));
  } catch (error) {
    yield put(actions.fetchExpenseStats.failure(error));
  }
}

export default {
  fetchFinanceConfig,
  updateFinanceConfig,
  addFinanceMember,
  removeFinanceMember,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchExpenseStats,
};

