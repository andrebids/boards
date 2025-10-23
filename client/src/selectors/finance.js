/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const selectFinanceConfig = (state) => state.finance.config;

export const selectFinanceMembers = (state) => state.finance.financeMembers;

export const selectExpenses = (state) => state.finance.expenses;

export const selectFinanceStats = (state) => state.finance.stats;

export const selectFinanceIsLoading = (state) => state.finance.isLoading;

export const selectFinanceError = (state) => state.finance.error;

export const selectIsFinanceMember = (state, projectId, userId) => {
  const members = selectFinanceMembers(state);
  return members.some(
    (member) => member.projectId === projectId && member.userId === userId,
  );
};

export const selectExpensesByCategory = (state) => {
  const stats = selectFinanceStats(state);
  return stats ? stats.byCategory : [];
};

export const selectExpensesByMonth = (state) => {
  const stats = selectFinanceStats(state);
  return stats ? stats.byMonth : [];
};

