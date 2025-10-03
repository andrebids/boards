import ActionTypes from '../constants/ActionTypes';

export const fetchOrganizationDefaultLabels = () => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH,
  payload: {},
});

fetchOrganizationDefaultLabels.success = (items) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS,
  payload: { items },
});

fetchOrganizationDefaultLabels.failure = (error) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__FAILURE,
  payload: { error },
});

export const createOrganizationDefaultLabel = (data) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE,
  payload: { data },
});

createOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS,
  payload: { item },
});

export const updateOrganizationDefaultLabel = (id, data) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE,
  payload: { id, data },
});

updateOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS,
  payload: { item },
});

export const deleteOrganizationDefaultLabel = (id) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE,
  payload: { id },
});

deleteOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS,
  payload: { item },
});

export const reorderOrganizationDefaultLabels = (order) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER,
  payload: { order },
});

reorderOrganizationDefaultLabels.success = (items) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS,
  payload: { items },
});

export const bulkApplyOrganizationDefaultLabels = (projectIds, overwriteMode) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY,
  payload: { projectIds, overwriteMode },
});

bulkApplyOrganizationDefaultLabels.success = (results, summary) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY__SUCCESS,
  payload: { results, summary },
});

// WebSocket handlers
export const handleOrganizationDefaultLabelCreate = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE,
  payload: { item },
});

export const handleOrganizationDefaultLabelUpdate = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE,
  payload: { item },
});

export const handleOrganizationDefaultLabelDelete = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE,
  payload: { item },
});

export default {
  fetchOrganizationDefaultLabels,
  createOrganizationDefaultLabel,
  updateOrganizationDefaultLabel,
  deleteOrganizationDefaultLabel,
  reorderOrganizationDefaultLabels,
  bulkApplyOrganizationDefaultLabels,
  handleOrganizationDefaultLabelCreate,
  handleOrganizationDefaultLabelUpdate,
  handleOrganizationDefaultLabelDelete,
};

