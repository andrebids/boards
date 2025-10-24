/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectPath } from './router';
import { selectCurrentUserId } from './users';

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

// Selector para verificar se deve mostrar o botão do Finance Panel
// ESTRATÉGIA: Mostrar sempre, exceto se já sabemos que o usuário NÃO tem acesso
// O backend verificará a permissão real quando tentar acessar
export const selectCanCurrentUserAccessFinance = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (state) => selectPath(state).projectId,
  (state) => selectFinanceMembers(state),
  (state) => selectFinanceError(state),
  ({ User, ProjectManager }, currentUserId, projectId, financeMembers, error) => {
    if (!currentUserId || !projectId) {
      return false;
    }

    const currentUserModel = User.withId(currentUserId);

    if (!currentUserModel) {
      return false;
    }

    const currentUser = currentUserModel.ref;

    // 1. Verificar se é Admin Global - sempre tem acesso
    if (currentUser.role === 'admin') {
      return true;
    }

    // 2. Verificar se é Project Manager - sempre tem acesso  
    const isProjectManager = ProjectManager.all()
      .toRefArray()
      .some((pm) => pm.projectId === projectId && pm.userId === currentUserId);

    if (isProjectManager) {
      return true;
    }

    // 3. Se já sabemos que é Finance Member (carregado anteriormente)
    const isFinanceMember = financeMembers.some(
      (member) => member.projectId === projectId && member.userId === currentUserId
    );

    if (isFinanceMember) {
      return true;
    }

    // 4. Se já tentamos e recebemos erro de permissão (403/forbidden), não mostrar
    if (error && (error.status === 403 || error.message?.includes('forbidden') || error.message?.includes('finance member'))) {
      return false;
    }

    // 5. Caso contrário, mostrar o botão e deixar o backend decidir
    // Isso permite que Finance Members recém-adicionados vejam o botão
    return true;
  }
);

