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

export function* createExpenseWithAttachments(projectId, data, files) {
  try {
    console.log('[Finance][attachments] create-with-attachments start', {
      projectId,
      hasFiles: !!(files && files.length),
      filesCount: files ? files.length : 0,
      fileNames: (files || []).map((f) => f && f.name),
    });

    const { item: expense } = yield call(request, api.finance.createExpense, projectId, data);
    yield put(actions.createExpense.success(expense));

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          console.log('[Finance][attachments] uploading (create-with-attachments)', {
            expenseId: expense.id,
            name: file && file.name,
            type: file && file.type,
            size: file && file.size,
          });
          // Reuse the attachment saga for consistent logging and success dispatch
          yield call(createExpenseAttachment, expense.id, file, file.name);
          console.log('[Finance][attachments] upload success (create-with-attachments)', {
            expenseId: expense.id,
            name: file && file.name,
          });
        } catch (e) {
          console.error('[Finance][attachments] upload failed (create-with-attachments)', e);
        }
      }
      console.log('[Finance][attachments] fetch after upload', { expenseId: expense.id });
      // refresh attachments list to ensure the first column updates immediately
      yield call(fetchExpenseAttachments, expense.id);
    }

    // Atualizar estatísticas
    yield call(fetchExpenseStats, projectId);
  } catch (error) {
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

export function* fetchExpenseAttachments(expenseId) {
  try {
    console.log('[Finance][attachments] fetching list for expense', expenseId);
    const { items } = yield call(request, api.finance.getExpenseAttachments, expenseId);
    console.log('[Finance][attachments] fetched', { expenseId, count: (items || []).length, items });
    yield put(actions.fetchExpenseAttachmentsSuccess(expenseId, items || []));
  } catch (error) {
    console.error('[Finance][attachments] fetch failed', { expenseId, error });
    yield put(actions.fetchExpenseAttachmentsFailure(error));
  }
}

export function* createExpenseAttachment(expenseId, file, name) {
  try {
    console.log('[Finance][attachments] uploading', { expenseId, name: name || file?.name, type: file?.type, size: file?.size });
    const { item } = yield call(request, api.finance.createExpenseAttachment, expenseId, file, name);
    console.log('[Finance][attachments] upload success', { expenseId, attachmentId: item?.id, item });
    yield put(actions.createExpenseAttachmentSuccess(item));
  } catch (error) {
    console.error('[Finance][attachments] upload failed', { expenseId, error });
    yield put(actions.createExpenseAttachmentFailure(error));
  }
}

export function* deleteExpenseAttachment(attachmentId) {
  try {
    yield call(request, api.finance.deleteExpenseAttachment, attachmentId);
    yield put(actions.deleteExpenseAttachmentSuccess(attachmentId));
  } catch (error) {
    yield put(actions.deleteExpenseAttachmentFailure(error));
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
  fetchExpenseAttachments,
  createExpenseAttachment,
  deleteExpenseAttachment,
  createExpenseWithAttachments,
};

