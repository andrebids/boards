export const getTaskAssigneeUserIds = (task) => {
  let userIds = [];
  if (Array.isArray(task.assigneeUserIds)) {
    userIds = task.assigneeUserIds;
  } else if (task.assigneeUserId) {
    userIds = [task.assigneeUserId];
  }

  return [...new Set(userIds.filter(Boolean))];
};

export const toggleTaskAssignee = (userIds, userId, isSelected) =>
  isSelected
    ? [...new Set([...userIds, userId])]
    : userIds.filter((currentUserId) => currentUserId !== userId);
