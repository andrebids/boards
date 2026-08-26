/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const buildTaskRows = (tasks, collapsedTaskIds = new Set()) => {
  const childrenByParentTaskId = new Map();

  tasks.forEach((task) => {
    const parentTaskId = task.parentTaskId || null;
    const children = childrenByParentTaskId.get(parentTaskId) || [];
    children.push(task);
    childrenByParentTaskId.set(parentTaskId, children);
  });

  const hiddenTaskIds = new Set();

  const hideDescendants = (task) => {
    (childrenByParentTaskId.get(task.id) || []).forEach((childTask) => {
      if (hiddenTaskIds.has(childTask.id)) {
        return;
      }

      hiddenTaskIds.add(childTask.id);
      hideDescendants(childTask);
    });
  };

  tasks.forEach((task) => {
    if (collapsedTaskIds.has(task.id)) {
      hideDescendants(task);
    }
  });

  const rows = [];
  const visitedTaskIds = new Set();

  const appendTask = (task, depth) => {
    if (visitedTaskIds.has(task.id)) {
      return;
    }

    visitedTaskIds.add(task.id);
    rows.push({ task, depth });

    if (!collapsedTaskIds.has(task.id)) {
      (childrenByParentTaskId.get(task.id) || []).forEach((childTask) => {
        appendTask(childTask, depth + 1);
      });
    }
  };

  (childrenByParentTaskId.get(null) || []).forEach((task) => {
    appendTask(task, 0);
  });

  tasks.forEach((task) => {
    if (!hiddenTaskIds.has(task.id)) {
      appendTask(task, 0);
    }
  });

  return rows;
};

export default buildTaskRows;
