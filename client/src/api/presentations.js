import socket from './socket';
import http from './http';

const getProjectPresentations = (projectId, headers) =>
  socket.get(`/projects/${projectId}/presentation`, undefined, headers);

const createBoardPresentation = (boardId, headers) =>
  socket.post(`/boards/${boardId}/presentation`, {}, headers);

const disableProjectPresentation = (id, headers) =>
  socket.post(`/project-presentations/${id}/disable`, {}, headers);

const updateProjectPresentationCryptPadKey = (id, data, headers) =>
  socket.post(`/project-presentations/${id}/cryptpad-key`, data, headers);

const saveProjectPresentationFile = (id, file, headers) =>
  http.post(`/project-presentations/${id}/file`, { file }, headers);

export default {
  getProjectPresentations,
  createBoardPresentation,
  disableProjectPresentation,
  updateProjectPresentationCryptPadKey,
  saveProjectPresentationFile,
};
