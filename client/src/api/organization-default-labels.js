import socket from './socket';

export const fetchOrganizationDefaultLabels = (headers) =>
  socket.get('/organization-default-labels', undefined, headers);

export const createOrganizationDefaultLabel = (data, headers) =>
  socket.post('/organization-default-labels', data, headers);

export const updateOrganizationDefaultLabel = (id, data, headers) =>
  socket.patch(`/organization-default-labels/${id}`, data, headers);

export const deleteOrganizationDefaultLabel = (id, headers) =>
  socket.delete(`/organization-default-labels/${id}`, undefined, headers);

export const reorderOrganizationDefaultLabels = (order, headers) =>
  socket.post('/organization-default-labels/reorder', { order }, headers);

export const bulkApplyOrganizationDefaultLabels = (projectIds, overwriteMode, headers) =>
  socket.post('/organization-default-labels/bulk-apply', {
    projectIds,
    overwriteMode,
  }, headers);

export default {
  fetchOrganizationDefaultLabels,
  createOrganizationDefaultLabel,
  updateOrganizationDefaultLabel,
  deleteOrganizationDefaultLabel,
  reorderOrganizationDefaultLabels,
  bulkApplyOrganizationDefaultLabels,
};

