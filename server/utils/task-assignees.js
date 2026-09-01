const getTaskAssigneeUserIds = (task) => {
  let userIds = [];
  if (Array.isArray(task.assigneeUserIds)) {
    userIds = task.assigneeUserIds;
  } else if (task.assigneeUserId) {
    userIds = [task.assigneeUserId];
  }

  return [...new Set(userIds.filter(Boolean))];
};

const attachTaskAssigneeUserIds = (tasks, taskAssignees) => {
  const userIdsByTaskId = new Map();
  taskAssignees.forEach(({ taskId, userId }) => {
    userIdsByTaskId.set(taskId, [...(userIdsByTaskId.get(taskId) || []), userId]);
  });

  return tasks.map((task) => ({
    ...task,
    assigneeUserIds: userIdsByTaskId.get(task.id) || getTaskAssigneeUserIds(task),
  }));
};

module.exports = {
  getTaskAssigneeUserIds,
  attachTaskAssigneeUserIds,
};
