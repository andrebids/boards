/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { isLocalId } from '../utils/local-id';

export const makeSelectTaskListById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ TaskList }, id) => {
      const taskListModel = TaskList.withId(id);

      if (!taskListModel) {
        return taskListModel;
      }

      return {
        ...taskListModel.ref,
        isPersisted: !isLocalId(taskListModel.id),
      };
    },
  );

export const selectTaskListById = makeSelectTaskListById();

export const makeSelectTasksByTaskListId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ TaskList }, id) => {
      const taskListModel = TaskList.withId(id);

      if (!taskListModel) {
        return taskListModel;
      }

      return taskListModel.getTasksQuerySet().toRefArray();
    },
  );

export const selectTasksByTaskListId = makeSelectTasksByTaskListId();

export const makeSelectRootTasksByTaskListId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ TaskList }, id) => {
      const taskListModel = TaskList.withId(id);
      if (!taskListModel) {
        return taskListModel;
      }
      return taskListModel
        .getTasksQuerySet()
        .toRefArray()
        .filter((task) => !task.parentTaskId);
    },
  );

export const selectRootTasksByTaskListId = makeSelectRootTasksByTaskListId();

export default {
  makeSelectTaskListById,
  selectTaskListById,
  makeSelectTasksByTaskListId,
  selectTasksByTaskListId,
  makeSelectRootTasksByTaskListId,
  selectRootTasksByTaskListId,
};
