/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';
import http from './http';

/* Actions */

const getProjects = headers => socket.get('/projects', undefined, headers);

const createProject = (data, headers) =>
  socket.post('/projects', data, headers);

const getProject = (id, headers) =>
  socket.get(`/projects/${id}`, undefined, headers);

const updateProject = (id, data, headers) =>
  socket.patch(`/projects/${id}`, data, headers);

const deleteProject = (id, headers) =>
  socket.delete(`/projects/${id}`, undefined, headers);

const getProjectCardMemberOptions = (id, headers) =>
  socket.get(`/projects/${id}/card-member-options`, undefined, headers);

const addProjectCardMembers = (id, data, headers) =>
  http.post(`/projects/${id}/card-memberships/bulk`, data, headers);

export default {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectCardMemberOptions,
  addProjectCardMembers,
};
