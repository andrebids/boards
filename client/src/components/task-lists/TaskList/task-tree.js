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

export const getDescendantTaskIds = (tasks, taskId) => {
  const descendantTaskIds = new Set();
  let parentTaskIds = new Set([taskId]);

  while (parentTaskIds.size > 0) {
    const nextParentTaskIds = new Set();

    tasks.forEach((task) => {
      if (parentTaskIds.has(task.parentTaskId) && !descendantTaskIds.has(task.id)) {
        descendantTaskIds.add(task.id);
        nextParentTaskIds.add(task.id);
      }
    });

    parentTaskIds = nextParentTaskIds;
  }

  return descendantTaskIds;
};

export const resolveTaskDrop = ({
  taskId,
  sourceTaskListId,
  sourceIndex,
  destinationTaskListId,
  destinationIndex,
  combineTaskId,
  tasksByTaskListId,
  collapsedTaskIdsByTaskListId = {},
}) => {
  const sourceTasks = tasksByTaskListId[sourceTaskListId] || [];
  const destinationTasks = tasksByTaskListId[destinationTaskListId] || [];
  const task = sourceTasks.find((currentTask) => currentTask.id === taskId);

  if (!task) {
    return null;
  }

  const descendantTaskIds = getDescendantTaskIds(sourceTasks, taskId);
  const excludedTaskIds = new Set([taskId, ...descendantTaskIds]);

  let parentTaskId;
  let index;

  if (combineTaskId) {
    const parentTask = destinationTasks.find((currentTask) => currentTask.id === combineTaskId);
    if (!parentTask || excludedTaskIds.has(parentTask.id)) {
      return null;
    }

    parentTaskId = parentTask.id;
    index = destinationTasks.filter(
      (currentTask) =>
        currentTask.parentTaskId === parentTaskId && !excludedTaskIds.has(currentTask.id),
    ).length;
  } else {
    const destinationRows = buildTaskRows(
      destinationTasks,
      collapsedTaskIdsByTaskListId[destinationTaskListId],
    );

    if (destinationIndex >= destinationRows.length) {
      parentTaskId = null;
      index = destinationTasks.filter(
        (currentTask) => !currentTask.parentTaskId && !excludedTaskIds.has(currentTask.id),
      ).length;
    } else {
      const anchorRow = destinationRows[destinationIndex];
      if (!anchorRow || excludedTaskIds.has(anchorRow.task.id)) {
        return null;
      }

      parentTaskId = anchorRow.task.parentTaskId || null;
      const siblings = destinationTasks.filter(
        (currentTask) =>
          (currentTask.parentTaskId || null) === parentTaskId &&
          !excludedTaskIds.has(currentTask.id),
      );
      const anchorIndex = siblings.findIndex((currentTask) => currentTask.id === anchorRow.task.id);

      index = anchorIndex + (sourceTaskListId === destinationTaskListId && sourceIndex < destinationIndex ? 1 : 0);
    }
  }

  const currentSiblings = sourceTasks.filter(
    (currentTask) =>
      (currentTask.parentTaskId || null) === (task.parentTaskId || null) && currentTask.id !== taskId,
  );
  const currentIndex = sourceTasks
    .filter((currentTask) => (currentTask.parentTaskId || null) === (task.parentTaskId || null))
    .findIndex((currentTask) => currentTask.id === taskId);

  if (
    sourceTaskListId === destinationTaskListId &&
    (task.parentTaskId || null) === parentTaskId &&
    Math.min(index, currentSiblings.length) === currentIndex
  ) {
    return null;
  }

  return {
    taskListId: destinationTaskListId,
    parentTaskId,
    index,
  };
};

export default buildTaskRows;
