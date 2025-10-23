/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

/* Finance Config */

const fetchFinanceConfig = (projectId) => ({
  type: ActionTypes.FINANCE_CONFIG_FETCH,
  payload: {
    projectId,
  },
});

fetchFinanceConfig.success = (config, financeMembers) => ({
  type: ActionTypes.FINANCE_CONFIG_FETCH__SUCCESS,
  payload: {
    config,
    financeMembers,
  },
});

fetchFinanceConfig.failure = (error) => ({
  type: ActionTypes.FINANCE_CONFIG_FETCH__FAILURE,
  payload: {
    error,
  },
});

const updateFinanceConfig = (projectId, data) => ({
  type: ActionTypes.FINANCE_CONFIG_UPDATE,
  payload: {
    projectId,
    data,
  },
});

updateFinanceConfig.success = (config) => ({
  type: ActionTypes.FINANCE_CONFIG_UPDATE__SUCCESS,
  payload: {
    config,
  },
});

updateFinanceConfig.failure = (error) => ({
  type: ActionTypes.FINANCE_CONFIG_UPDATE__FAILURE,
  payload: {
    error,
  },
});

/* Finance Members */

const addFinanceMember = (projectId, userId) => ({
  type: ActionTypes.FINANCE_MEMBER_ADD,
  payload: {
    projectId,
    userId,
  },
});

addFinanceMember.success = (financeMember, user) => ({
  type: ActionTypes.FINANCE_MEMBER_ADD__SUCCESS,
  payload: {
    financeMember,
    user,
  },
});

addFinanceMember.failure = (error) => ({
  type: ActionTypes.FINANCE_MEMBER_ADD__FAILURE,
  payload: {
    error,
  },
});

const removeFinanceMember = (memberId) => ({
  type: ActionTypes.FINANCE_MEMBER_REMOVE,
  payload: {
    memberId,
  },
});

removeFinanceMember.success = (memberId) => ({
  type: ActionTypes.FINANCE_MEMBER_REMOVE__SUCCESS,
  payload: {
    memberId,
  },
});

removeFinanceMember.failure = (error) => ({
  type: ActionTypes.FINANCE_MEMBER_REMOVE__FAILURE,
  payload: {
    error,
  },
});

/* Expenses */

const fetchExpenses = (projectId, filters) => ({
  type: ActionTypes.EXPENSES_FETCH,
  payload: {
    projectId,
    filters,
  },
});

fetchExpenses.success = (expenses) => ({
  type: ActionTypes.EXPENSES_FETCH__SUCCESS,
  payload: {
    expenses,
  },
});

fetchExpenses.failure = (error) => ({
  type: ActionTypes.EXPENSES_FETCH__FAILURE,
  payload: {
    error,
  },
});

const createExpense = (projectId, data) => ({
  type: ActionTypes.EXPENSE_CREATE,
  payload: {
    projectId,
    data,
  },
});

createExpense.success = (expense) => ({
  type: ActionTypes.EXPENSE_CREATE__SUCCESS,
  payload: {
    expense,
  },
});

createExpense.failure = (error) => ({
  type: ActionTypes.EXPENSE_CREATE__FAILURE,
  payload: {
    error,
  },
});

const updateExpense = (expenseId, data) => ({
  type: ActionTypes.EXPENSE_UPDATE,
  payload: {
    expenseId,
    data,
  },
});

updateExpense.success = (expense) => ({
  type: ActionTypes.EXPENSE_UPDATE__SUCCESS,
  payload: {
    expense,
  },
});

updateExpense.failure = (error) => ({
  type: ActionTypes.EXPENSE_UPDATE__FAILURE,
  payload: {
    error,
  },
});

const deleteExpense = (expenseId) => ({
  type: ActionTypes.EXPENSE_DELETE,
  payload: {
    expenseId,
  },
});

deleteExpense.success = (expenseId) => ({
  type: ActionTypes.EXPENSE_DELETE__SUCCESS,
  payload: {
    expenseId,
  },
});

deleteExpense.failure = (error) => ({
  type: ActionTypes.EXPENSE_DELETE__FAILURE,
  payload: {
    error,
  },
});

const fetchExpenseStats = (projectId) => ({
  type: ActionTypes.EXPENSE_STATS_FETCH,
  payload: {
    projectId,
  },
});

fetchExpenseStats.success = (stats) => ({
  type: ActionTypes.EXPENSE_STATS_FETCH__SUCCESS,
  payload: {
    stats,
  },
});

fetchExpenseStats.failure = (error) => ({
  type: ActionTypes.EXPENSE_STATS_FETCH__FAILURE,
  payload: {
    error,
  },
});

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

