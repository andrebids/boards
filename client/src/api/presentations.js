import socket from './socket';

const getProjectPresentation = (projectId, headers) =>
  socket.get(`/projects/${projectId}/presentation`, undefined, headers);

const createProjectPresentation = (projectId, headers) =>
  socket.post(`/projects/${projectId}/presentation`, {}, headers);

const disableProjectPresentation = (id, headers) =>
  socket.post(`/project-presentations/${id}/disable`, {}, headers);

export default {
  getProjectPresentation,
  createProjectPresentation,
  disableProjectPresentation,
};
