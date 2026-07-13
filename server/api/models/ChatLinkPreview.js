/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Statuses = {
  PENDING: 'pending',
  READY: 'ready',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

module.exports = {
  Statuses,
  tableName: 'chat_link_preview',

  attributes: {
    normalizedUrl: { type: 'string', required: true, columnName: 'normalized_url' },
    url: { type: 'string', required: true },
    hostname: { type: 'string', required: true },
    title: { type: 'string', allowNull: true },
    description: { type: 'string', allowNull: true },
    siteName: { type: 'string', allowNull: true, columnName: 'site_name' },
    status: { type: 'string', isIn: Object.values(Statuses), defaultsTo: Statuses.PENDING },
    fetchedAt: { type: 'ref', columnName: 'fetched_at' },
    expiresAt: { type: 'ref', columnName: 'expires_at' },
    failureReason: { type: 'string', allowNull: true, columnName: 'failure_reason' },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
  },
};
