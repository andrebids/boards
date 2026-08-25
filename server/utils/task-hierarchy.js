const isTaskInParentChain = async ({ taskId, parentTask, getTaskById }) => {
  const visitedTaskIds = new Set();
  let currentTask = parentTask;

  while (currentTask) {
    if (currentTask.id === taskId || visitedTaskIds.has(currentTask.id)) {
      return true;
    }

    visitedTaskIds.add(currentTask.id);
    if (currentTask.parentTaskId) {
      // eslint-disable-next-line no-await-in-loop
      currentTask = await getTaskById(currentTask.parentTaskId);
    } else {
      currentTask = null;
    }
  }

  return false;
};

module.exports = {
  isTaskInParentChain,
};
