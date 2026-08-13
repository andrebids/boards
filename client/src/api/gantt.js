/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

const getProjectGanttPlan = (projectId, headers) =>
  socket.get(`/projects/${projectId}/gantt-plan`, undefined, headers);

const createProjectGanttPlan = (projectId, headers) =>
  socket.post(`/projects/${projectId}/gantt-plan`, {}, headers);

const updateGanttPlan = (id, data, headers) => socket.patch(`/gantt-plans/${id}`, data, headers);

const disableGanttPlan = (id, headers) => socket.post(`/gantt-plans/${id}/disable`, {}, headers);

const createGanttItem = (ganttPlanId, data, headers) =>
  socket.post(`/gantt-plans/${ganttPlanId}/items`, data, headers);

const updateGanttItem = (id, data, headers) => socket.patch(`/gantt-items/${id}`, data, headers);

const updateGanttItemDependencies = (id, predecessorIds, headers) =>
  socket.patch(`/gantt-items/${id}/dependencies`, { predecessorIds }, headers);

const deleteGanttItem = (id, headers) => socket.delete(`/gantt-items/${id}`, undefined, headers);

export default {
  getProjectGanttPlan,
  createProjectGanttPlan,
  updateGanttPlan,
  disableGanttPlan,
  createGanttItem,
  updateGanttItem,
  updateGanttItemDependencies,
  deleteGanttItem,
};
