import { call, put, takeEvery } from 'redux-saga/effects';

import request from './core/request';
import api from '../api';
import actions from '../actions';
import ActionTypes from '../constants/ActionTypes';

function* fetchOrganizationDefaultLabels() {
  try {
    const response = yield call(request, api.fetchOrganizationDefaultLabels);
    yield put(actions.fetchOrganizationDefaultLabels.success(response.items));
  } catch (error) {
    yield put(actions.fetchOrganizationDefaultLabels.failure(error));
  }
}

function* createOrganizationDefaultLabel(action) {
  console.log('🔵 [SAGA] Creating organization default label...', action.payload.data);
  try {
    const response = yield call(request, api.createOrganizationDefaultLabel, action.payload.data);
    console.log(`✅ [SAGA] Organization default label created: "${response.item.name}"`);
    yield put(actions.createOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error creating organization default label:', error);
  }
}

function* updateOrganizationDefaultLabel(action) {
  console.log('🔵 [SAGA] Updating organization default label...', action.payload);
  try {
    const response = yield call(
      request,
      api.updateOrganizationDefaultLabel,
      action.payload.id,
      action.payload.data
    );
    console.log(`✅ [SAGA] Organization default label updated (ID: ${action.payload.id})`);
    yield put(actions.updateOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error updating organization default label:', error);
  }
}

function* deleteOrganizationDefaultLabel(action) {
  console.log(`🔵 [SAGA] Deleting organization default label (ID: ${action.payload.id})...`);
  try {
    const response = yield call(request, api.deleteOrganizationDefaultLabel, action.payload.id);
    console.log(`✅ [SAGA] Organization default label deleted (ID: ${action.payload.id})`);
    yield put(actions.deleteOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error deleting organization default label:', error);
  }
}

function* reorderOrganizationDefaultLabels(action) {
  console.log('🔵 [SAGA] Reordering organization default labels...', `${action.payload.order.length} items`);
  try {
    const response = yield call(request, api.reorderOrganizationDefaultLabels, action.payload.order);
    console.log(`✅ [SAGA] Labels reordered successfully`);
    yield put(actions.reorderOrganizationDefaultLabels.success(response.items));
  } catch (error) {
    console.error('🔴 [SAGA] Error reordering organization default labels:', error);
  }
}

function* bulkApplyOrganizationDefaultLabels(action) {
  console.log('🔵 [SAGA] Bulk applying organization default labels...', action.payload);
  try {
    const response = yield call(
      request,
      api.bulkApplyOrganizationDefaultLabels,
      action.payload.projectIds,
      action.payload.overwriteMode
    );
    console.log(`✅ [SAGA] Bulk apply completed: ${response.summary.successful}/${response.summary.total} projects successful`);
    yield put(
      actions.bulkApplyOrganizationDefaultLabels.success(
        response.results,
        response.summary
      )
    );
  } catch (error) {
    console.error('🔴 [SAGA] Error bulk applying organization default labels:', error);
  }
}

export default function* organizationDefaultLabelsSaga() {
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH,
    fetchOrganizationDefaultLabels
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE,
    createOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE,
    updateOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE,
    deleteOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER,
    reorderOrganizationDefaultLabels
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY,
    bulkApplyOrganizationDefaultLabels
  );
}

