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
  const parentTaskIds = [taskId];

  for (let parentIndex = 0; parentIndex < parentTaskIds.length; parentIndex += 1) {
    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
      const task = tasks[taskIndex];
      if (task.parentTaskId === parentTaskIds[parentIndex] && !descendantTaskIds.has(task.id)) {
        descendantTaskIds.add(task.id);
        parentTaskIds.push(task.id);
      }
    }
  }

  return descendantTaskIds;
};

export const getTaskDepth = (tasks, taskId) => {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const visitedTaskIds = new Set([taskId]);
  let task = tasksById.get(taskId);
  let depth = 0;

  while (task && task.parentTaskId && !visitedTaskIds.has(task.parentTaskId)) {
    const parentTask = tasksById.get(task.parentTaskId);
    if (!parentTask) {
      break;
    }

    visitedTaskIds.add(parentTask.id);
    task = parentTask;
    depth += 1;
  }

  return depth;
};

export const getTaskDropIndicator = ({
  taskId,
  sourceTaskListId,
  destinationTaskListId,
  combineTaskId,
  result,
  tasksByTaskListId,
  collapsedTaskIdsByTaskListId = {},
}) => {
  if (!result) {
    return null;
  }

  const sourceTasks = tasksByTaskListId[sourceTaskListId] || [];
  const destinationTasks = tasksByTaskListId[destinationTaskListId] || [];
  const excludedTaskIds =
    sourceTaskListId === destinationTaskListId
      ? new Set([taskId, ...getDescendantTaskIds(sourceTasks, taskId)])
      : new Set();
  const rows = buildTaskRows(
    destinationTasks,
    collapsedTaskIdsByTaskListId[destinationTaskListId],
  ).filter(({ task }) => !excludedTaskIds.has(task.id));
  const siblings = destinationTasks.filter(
    (task) =>
      (task.parentTaskId || null) === (result.parentTaskId || null) &&
      !excludedTaskIds.has(task.id),
  );
  const index = Math.min(result.index, siblings.length);
  const nextSibling = siblings[index];

  if (nextSibling) {
    return {
      taskListId: destinationTaskListId,
      targetTaskId: nextSibling.id,
      position: combineTaskId ? 'inside' : 'before',
      depth: result.parentTaskId ? getTaskDepth(destinationTasks, result.parentTaskId) + 1 : 0,
    };
  }

  const previousSibling = siblings[index - 1];
  if (previousSibling) {
    const rowIndex = rows.findIndex(({ task }) => task.id === previousSibling.id);
    const siblingDepth = rowIndex >= 0 ? rows[rowIndex].depth : 0;
    let targetTaskId = previousSibling.id;

    for (let indexOffset = rowIndex + 1; indexOffset < rows.length; indexOffset += 1) {
      if (rows[indexOffset].depth <= siblingDepth) {
        break;
      }
      targetTaskId = rows[indexOffset].task.id;
    }

    return {
      taskListId: destinationTaskListId,
      targetTaskId,
      position: combineTaskId ? 'inside' : 'after',
      depth: result.parentTaskId ? getTaskDepth(destinationTasks, result.parentTaskId) + 1 : 0,
    };
  }

  if (result.parentTaskId) {
    return {
      taskListId: destinationTaskListId,
      targetTaskId: result.parentTaskId,
      position: combineTaskId ? 'inside' : 'after',
      depth: getTaskDepth(destinationTasks, result.parentTaskId) + 1,
    };
  }

  return {
    taskListId: destinationTaskListId,
    targetTaskId: null,
    position: 'empty',
    depth: 0,
  };
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

      index =
        anchorIndex +
        (sourceTaskListId === destinationTaskListId && sourceIndex < destinationIndex ? 1 : 0);
    }
  }

  const currentSiblings = sourceTasks.filter(
    (currentTask) =>
      (currentTask.parentTaskId || null) === (task.parentTaskId || null) &&
      currentTask.id !== taskId,
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
