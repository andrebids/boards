/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import { getDescendantTaskIds } from '../../../components/task-lists/TaskList/task-tree';

export function* createTask(taskListId, data) {
  const localId = yield call(createLocalId);

  const nextData = {
    ...data,
    position: yield select(
      selectors.selectNextTaskPosition,
      taskListId,
      undefined,
      undefined,
      data.parentTaskId,
    ),
  };

  yield put(
    actions.createTask({
      ...nextData,
      taskListId,
      id: localId,
    }),
  );

  let task;
  try {
    ({ item: task } = yield call(request, api.createTask, taskListId, nextData));
  } catch (error) {
    yield put(actions.createTask.failure(localId, error));
    return;
  }

  yield put(actions.createTask.success(localId, task));
}

export function* handleTaskCreate(task) {
  yield put(actions.handleTaskCreate(task));
}

export function* updateTask(id, data) {
  yield put(actions.updateTask(id, data));

  let task;
  try {
    ({ item: task } = yield call(request, api.updateTask, id, data));
  } catch (error) {
    yield put(actions.updateTask.failure(id, error));
    return;
  }

  yield put(actions.updateTask.success(task));
}

export function* handleTaskUpdate(task) {
  yield put(actions.handleTaskUpdate(task));
}

export function* moveTask(id, taskListId, parentTaskId, index) {
  const task = yield select(selectors.selectTaskById, id);
  const sourceTasks = yield select(selectors.selectTasksByTaskListId, task.taskListId);
  const descendantTaskIds = getDescendantTaskIds(sourceTasks, id);
  const previousTasks = sourceTasks
    .filter((currentTask) => currentTask.id === id || descendantTaskIds.has(currentTask.id))
    .map((currentTask) => ({ ...currentTask }));
  const position = yield select(
    selectors.selectNextTaskPosition,
    taskListId,
    index,
    id,
    parentTaskId,
  );
  const data = {
    taskListId,
    parentTaskId,
    position,
  };

  yield put(actions.updateTask(id, data));
  if (task.taskListId !== taskListId) {
    yield all(
      [...descendantTaskIds].map((descendantTaskId) =>
        put(actions.updateTask(descendantTaskId, { taskListId })),
      ),
    );
  }

  let response;
  try {
    response = yield call(request, api.updateTask, id, data);
  } catch (error) {
    yield all(previousTasks.map((previousTask) => put(actions.handleTaskUpdate(previousTask))));
    yield put(actions.updateTask.failure(id, error));
    return;
  }

  yield put(actions.updateTask.success(response.item));
  if (response.included && response.included.tasks) {
    yield all(
      response.included.tasks.map((includedTask) => put(actions.updateTask.success(includedTask))),
    );
  }
}

export function* deleteTask(id) {
  yield put(actions.deleteTask(id));

  let task;
  try {
    ({ item: task } = yield call(request, api.deleteTask, id));
  } catch (error) {
    yield put(actions.deleteTask.failure(id, error));
    return;
  }

  yield put(actions.deleteTask.success(task));
}

export function* handleTaskDelete(task) {
  yield put(actions.handleTaskDelete(task));
}

export default {
  createTask,
  handleTaskCreate,
  updateTask,
  handleTaskUpdate,
  moveTask,
  deleteTask,
  handleTaskDelete,
};
