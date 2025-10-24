/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  config: null,
  financeMembers: [],
  expenses: [],
  expenseAttachmentsByExpenseId: {},
  uploadingAttachmentByExpenseId: {},
  stats: null,
  isLoading: false,
  error: null,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.FINANCE_CONFIG_FETCH:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case ActionTypes.FINANCE_CONFIG_FETCH__SUCCESS:
      return {
        ...state,
        config: payload.config,
        financeMembers: payload.financeMembers,
        isLoading: false,
      };
    case ActionTypes.FINANCE_CONFIG_FETCH__FAILURE:
      return {
        ...state,
        isLoading: false,
        error: payload.error,
      };
    case ActionTypes.FINANCE_CONFIG_UPDATE__SUCCESS:
      return {
        ...state,
        config: payload.config,
      };
    case ActionTypes.FINANCE_MEMBER_ADD__SUCCESS:
      return {
        ...state,
        financeMembers: [...state.financeMembers, payload.financeMember],
      };
    case ActionTypes.FINANCE_MEMBER_REMOVE__SUCCESS:
      return {
        ...state,
        financeMembers: state.financeMembers.filter(
          (member) => member.id !== payload.memberId,
        ),
      };
    case ActionTypes.EXPENSES_FETCH:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case ActionTypes.EXPENSES_FETCH__SUCCESS:
      return {
        ...state,
        expenses: payload.expenses,
        isLoading: false,
      };
    case ActionTypes.EXPENSES_FETCH__FAILURE:
      return {
        ...state,
        isLoading: false,
        error: payload.error,
      };
    case ActionTypes.EXPENSE_CREATE__SUCCESS:
      return {
        ...state,
        expenses: [payload.expense, ...state.expenses],
      };
    case ActionTypes.EXPENSE_UPDATE__SUCCESS:
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === payload.expense.id ? payload.expense : expense,
        ),
      };
    case ActionTypes.EXPENSE_DELETE__SUCCESS:
      return {
        ...state,
        expenses: state.expenses.filter(
          (expense) => expense.id !== payload.expenseId,
        ),
      };
    case ActionTypes.EXPENSE_STATS_FETCH__SUCCESS:
      return {
        ...state,
        stats: payload.stats,
      };
    case ActionTypes.EXPENSE_ATTACHMENTS_FETCH__SUCCESS: {
      const { expenseId, attachments } = payload;
      return {
        ...state,
        expenseAttachmentsByExpenseId: {
          ...state.expenseAttachmentsByExpenseId,
          [expenseId]: attachments,
        },
      };
    }
    case ActionTypes.EXPENSE_ATTACHMENT_CREATE: {
      const expenseId = payload && payload.expenseId;
      if (!expenseId) return state;
      return {
        ...state,
        uploadingAttachmentByExpenseId: {
          ...state.uploadingAttachmentByExpenseId,
          [expenseId]: true,
        },
      };
    }
    case ActionTypes.EXPENSE_ATTACHMENT_CREATE__SUCCESS: {
      const attachment = payload.attachment;
      const list = state.expenseAttachmentsByExpenseId[attachment.expenseId] || [];
      return {
        ...state,
        expenseAttachmentsByExpenseId: {
          ...state.expenseAttachmentsByExpenseId,
          [attachment.expenseId]: [attachment, ...list],
        },
        uploadingAttachmentByExpenseId: {
          ...state.uploadingAttachmentByExpenseId,
          [attachment.expenseId]: false,
        },
      };
    }
    case ActionTypes.EXPENSE_ATTACHMENT_CREATE__FAILURE: {
      const err = payload && payload.error;
      const expenseId = err && err.expenseId ? err.expenseId : (payload && payload.expenseId);
      if (!expenseId) return state;
      return {
        ...state,
        uploadingAttachmentByExpenseId: {
          ...state.uploadingAttachmentByExpenseId,
          [expenseId]: false,
        },
      };
    }
    case ActionTypes.EXPENSE_ATTACHMENT_DELETE__SUCCESS: {
      const { attachmentId } = payload;
      const byId = state.expenseAttachmentsByExpenseId;
      // remover de todas as listas (mais simples; listas são curtas)
      const next = Object.keys(byId).reduce((acc, key) => {
        acc[key] = (byId[key] || []).filter(a => a.id !== attachmentId);
        return acc;
      }, {});
      return {
        ...state,
        expenseAttachmentsByExpenseId: next,
      };
    }
    default:
      return state;
  }
};

