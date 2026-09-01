const sortTasks = (tasks) =>
  [...tasks].sort(
    (first, second) =>
      Number(first.position || 0) - Number(second.position || 0) ||
      String(first.id).localeCompare(String(second.id)),
  );

const TASK_ROW_HEIGHT = 34;
const TASK_ROW_GAP = 2;

export const getDashboardTaskListLayout = (taskCount, availableHeight) => {
  const availableRows = Math.max(
    1,
    Math.floor((availableHeight + TASK_ROW_GAP) / (TASK_ROW_HEIGHT + TASK_ROW_GAP)),
  );
  const columns = Math.max(1, Math.ceil(taskCount / availableRows));

  return {
    columns,
    rows: Math.max(1, Math.ceil(taskCount / columns)),
  };
};

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
