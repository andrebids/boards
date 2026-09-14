const sortTasks = (tasks) =>
  [...tasks].sort(
    (first, second) =>
      Number(first.position || 0) - Number(second.position || 0) ||
      String(first.id).localeCompare(String(second.id)),
  );

const TASK_ROW_HEIGHT = 34;
const TASK_ROW_MAX_HEIGHT = 56;
const TASK_ROW_GAP = 2;

// Type grows with the row, between the 13px floor used across the TV dashboard and
// a size that still leaves room for long lists.
const getTaskListFontSize = (rowHeight) => {
  if (rowHeight >= 56) return 18;
  if (rowHeight >= 44) return 16;
  if (rowHeight >= 36) return 14;
  return 13;
};

export const getDashboardTaskListLayout = (taskCount, availableHeight, availableWidth) => {
  if (availableWidth !== undefined) {
    // Keep useful sentence widths; reduce type/row height before adding narrow columns.
    const maxColumns = Math.max(1, Math.floor(availableWidth / 380));
    const columns = Math.min(
      maxColumns,
      Math.max(1, Math.ceil(taskCount / Math.max(1, Math.floor(availableHeight / 46)))),
    );
    const rows = Math.max(1, Math.ceil(taskCount / columns));
    const rowHeight = Math.max(
      32,
      Math.min(
        TASK_ROW_MAX_HEIGHT,
        Math.floor((availableHeight - (rows - 1) * TASK_ROW_GAP) / rows),
      ),
    );
    return { columns, rows, rowHeight, fontSize: getTaskListFontSize(rowHeight) };
  }
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
