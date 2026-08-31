const sortTasks = (tasks) =>
  [...tasks].sort(
    (first, second) =>
      Number(first.position || 0) - Number(second.position || 0) ||
      String(first.id).localeCompare(String(second.id)),
  );

export const createDashboardTaskListSnapshot = (body, taskListId) => {
  const taskList = body.included?.taskLists?.find(({ id }) => id === taskListId) || null;

  return {
    taskList,
    tasks: taskList
      ? sortTasks(body.included?.tasks?.filter((task) => task.taskListId === taskListId) || [])
      : [],
  };
};

export const reduceDashboardTaskListEvent = (state, eventName, item) => {
  const taskListId = state.taskList?.id;

  if (eventName === 'taskListUpdate' && item.id === taskListId) {
    return { ...state, taskList: { ...state.taskList, ...item } };
  }

  if (eventName === 'taskListDelete' && item.id === taskListId) {
    return { taskList: null, tasks: [] };
  }

  if (!['taskCreate', 'taskUpdate', 'taskDelete'].includes(eventName)) {
    return state;
  }

  const existingTask = state.tasks.find(({ id }) => id === item.id);
  const tasksWithoutItem = state.tasks.filter(({ id }) => id !== item.id);

  if (eventName === 'taskDelete' || item.taskListId !== taskListId) {
    return existingTask ? { ...state, tasks: tasksWithoutItem } : state;
  }

  return {
    ...state,
    tasks: sortTasks([...tasksWithoutItem, existingTask ? { ...existingTask, ...item } : item]),
  };
};
