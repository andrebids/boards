/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';
import http from './http';

/* Finance Config */

const getFinanceConfig = (projectId, headers) =>
  socket.get(`/projects/${projectId}/finance`, undefined, headers);

const updateFinanceConfig = (projectId, data, headers) =>
  socket.patch(`/projects/${projectId}/finance`, data, headers);

/* Finance Members */

const addFinanceMember = (projectId, userId, headers) =>
  socket.post(`/projects/${projectId}/finance-members`, { userId }, headers);

const removeFinanceMember = (memberId, headers) =>
  socket.delete(`/finance-members/${memberId}`, undefined, headers);

/* Expenses */

const getExpenses = (projectId, filters, headers) =>
  socket.get(`/projects/${projectId}/expenses`, filters, headers);

const createExpense = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/expenses`, data, headers);

const updateExpense = (expenseId, data, headers) =>
  socket.patch(`/expenses/${expenseId}`, data, headers);

const deleteExpense = (expenseId, headers) =>
  socket.delete(`/expenses/${expenseId}`, undefined, headers);

const getExpenseStats = (projectId, headers) =>
  socket.get(`/projects/${projectId}/expenses/stats`, undefined, headers);

/* Expense Attachments */

const getExpenseAttachments = (expenseId, headers) =>
  socket.get(`/expenses/${expenseId}/attachments`, undefined, headers);

const createExpenseAttachment = (expenseId, file, name, headers) =>
  http.post(`/expenses/${expenseId}/attachments`, { name: name || file.name, file }, headers);

const deleteExpenseAttachment = (attachmentId, headers) =>
  socket.delete(`/expense-attachments/${attachmentId}`, undefined, headers);

const getExpenseAttachmentDownloadUrl = (attachmentId, filename) =>
  `/expense-attachments/${attachmentId}/download/${encodeURIComponent(filename)}`;

export default {
  getFinanceConfig,
  updateFinanceConfig,
  addFinanceMember,
  removeFinanceMember,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getExpenseAttachments,
  createExpenseAttachment,
  deleteExpenseAttachment,
  getExpenseAttachmentDownloadUrl,
};

