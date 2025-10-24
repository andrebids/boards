/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from './services';
import ActionTypes from '../../constants/ActionTypes';

export default function* financeWatchers() {
  yield all([
    takeEvery(ActionTypes.FINANCE_CONFIG_FETCH, ({ payload: { projectId } }) =>
      services.fetchFinanceConfig(projectId),
    ),
    takeEvery(
      ActionTypes.FINANCE_CONFIG_UPDATE,
      ({ payload: { projectId, data } }) =>
        services.updateFinanceConfig(projectId, data),
    ),
    takeEvery(
      ActionTypes.FINANCE_MEMBER_ADD,
      ({ payload: { projectId, userId } }) =>
        services.addFinanceMember(projectId, userId),
    ),
    takeEvery(ActionTypes.FINANCE_MEMBER_REMOVE, ({ payload: { memberId } }) =>
      services.removeFinanceMember(memberId),
    ),
    takeEvery(
      ActionTypes.EXPENSES_FETCH,
      ({ payload: { projectId, filters } }) =>
        services.fetchExpenses(projectId, filters),
    ),
    takeEvery(ActionTypes.EXPENSE_CREATE, ({ payload: { projectId, data } }) =>
      services.createExpense(projectId, data),
    ),
    takeEvery(
      ActionTypes.EXPENSE_CREATE_WITH_ATTACHMENTS,
      ({ payload: { projectId, data, files } }) =>
        services.createExpenseWithAttachments(projectId, data, files),
    ),
    takeEvery(ActionTypes.EXPENSE_UPDATE, ({ payload: { expenseId, data } }) =>
      services.updateExpense(expenseId, data),
    ),
    takeEvery(ActionTypes.EXPENSE_DELETE, ({ payload: { expenseId } }) =>
      services.deleteExpense(expenseId),
    ),
    takeEvery(ActionTypes.EXPENSE_STATS_FETCH, ({ payload: { projectId } }) =>
      services.fetchExpenseStats(projectId),
    ),
    takeEvery(ActionTypes.EXPENSE_ATTACHMENTS_FETCH, ({ payload: { expenseId } }) =>
      services.fetchExpenseAttachments(expenseId),
    ),
    takeEvery(ActionTypes.EXPENSE_ATTACHMENT_CREATE, ({ payload: { expenseId, file, name } }) =>
      services.createExpenseAttachment(expenseId, file, name),
    ),
    takeEvery(ActionTypes.EXPENSE_ATTACHMENT_DELETE, ({ payload: { attachmentId } }) =>
      services.deleteExpenseAttachment(attachmentId),
    ),
  ]);
}

