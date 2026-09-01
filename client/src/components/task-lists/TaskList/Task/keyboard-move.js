const getSiblings = (tasks, parentTaskId) =>
  tasks.filter((task) => (task.parentTaskId || null) === (parentTaskId || null));

const getTaskKeyboardMove = (tasks, taskId, direction) => {
  const task = tasks.find((currentTask) => currentTask.id === taskId);
  if (!task) {
    return null;
  }

  const parentTaskId = task.parentTaskId || null;
  const siblings = getSiblings(tasks, parentTaskId);
  const index = siblings.findIndex((currentTask) => currentTask.id === taskId);

  if (direction === 'up') {
    return index > 0 ? { taskListId: task.taskListId, parentTaskId, index: index - 1 } : null;
  }

  if (direction === 'down') {
    return index < siblings.length - 1
      ? { taskListId: task.taskListId, parentTaskId, index: index + 1 }
      : null;
  }

  if (direction === 'in') {
    const previousSibling = siblings[index - 1];
    return previousSibling
      ? {
          taskListId: task.taskListId,
          parentTaskId: previousSibling.id,
          index: getSiblings(tasks, previousSibling.id).length,
        }
      : null;
  }

  if (direction === 'out' && parentTaskId) {
    const parentTask = tasks.find((currentTask) => currentTask.id === parentTaskId);
    if (!parentTask) {
      return null;
    }

    const grandParentTaskId = parentTask.parentTaskId || null;
    const parentIndex = getSiblings(tasks, grandParentTaskId).findIndex(
      (currentTask) => currentTask.id === parentTaskId,
    );

    return {
      taskListId: task.taskListId,
      parentTaskId: grandParentTaskId,
      index: parentIndex + 1,
    };
  }

  return null;
};

export default getTaskKeyboardMove;
