const TASK_LIST_NODE_PREFIX = 'task-list:';
const TASK_NODE_PREFIX = 'task:';
const FOOTER_NODE_PREFIX = 'task-list-footer:';

export const makeTaskListNodeId = (taskListId) => `${TASK_LIST_NODE_PREFIX}${taskListId}`;

export const makeTaskNodeId = (taskId) => `${TASK_NODE_PREFIX}${taskId}`;

export const makeFooterNodeId = (taskListId) => `${FOOTER_NODE_PREFIX}${taskListId}`;

const canTaskListHaveChildren = (draggedItem) => draggedItem.kind === 'task';
const canTaskHaveChildren = (draggedItem) => draggedItem.kind === 'task';

const buildTaskNodes = (tasks, taskListId, collapsedTaskIds) => {
  const tasksByParentId = new Map();

  tasks.forEach((task) => {
    const siblings = tasksByParentId.get(task.parentTaskId) || [];
    siblings.push(task);
    tasksByParentId.set(task.parentTaskId, siblings);
  });

  const buildChildren = (parentTaskId) =>
    (tasksByParentId.get(parentTaskId) || []).map((task) => ({
      id: makeTaskNodeId(task.id),
      kind: 'task',
      recordId: task.id,
      taskListId,
      collapsed: collapsedTaskIds.has(task.id),
      canHaveChildren: canTaskHaveChildren,
      children: buildChildren(task.id),
    }));

  return buildChildren(null);
};

export const buildSortableTaskTree = ({
  taskListIds,
  tasksByTaskListId,
  collapsedTaskIdsByTaskListId = {},
}) =>
  taskListIds.map((taskListId) => ({
    id: makeTaskListNodeId(taskListId),
    kind: 'taskList',
    recordId: taskListId,
    canHaveChildren: canTaskListHaveChildren,
    children: [
      ...buildTaskNodes(
        tasksByTaskListId[taskListId] || [],
        taskListId,
        collapsedTaskIdsByTaskListId[taskListId] || new Set(),
      ),
      {
        id: makeFooterNodeId(taskListId),
        kind: 'footer',
        recordId: taskListId,
        taskListId,
        canHaveChildren: false,
        disableSorting: true,
      },
    ],
  }));

const findTaskLocation = (items, taskId) => {
  const visit = (nodes, taskListId, parentTaskId) => {
    const taskNodes = nodes.filter((node) => node.kind === 'task');

    for (let index = 0; index < taskNodes.length; index += 1) {
      const node = taskNodes[index];
      if (node.recordId === taskId) {
        return { taskListId, parentTaskId, index };
      }

      const nestedLocation = visit(node.children || [], taskListId, node.recordId);
      if (nestedLocation) {
        return nestedLocation;
      }
    }

    return null;
  };

  return (
    items
      .filter((item) => item.kind === 'taskList')
      .map((taskListNode) => visit(taskListNode.children || [], taskListNode.recordId, null))
      .find(Boolean) || null
  );
};

export const getSortableTreeMove = (items, reason) => {
  if (reason.type !== 'dropped') {
    return null;
  }

  const { draggedItem } = reason;

  if (draggedItem.kind === 'taskList') {
    const index = items
      .filter((item) => item.kind === 'taskList')
      .findIndex((item) => item.recordId === draggedItem.recordId);

    return index === -1 ? null : { type: 'taskList', id: draggedItem.recordId, index };
  }

  if (draggedItem.kind !== 'task') {
    return null;
  }

  const location = findTaskLocation(items, draggedItem.recordId);
  return location ? { type: 'task', id: draggedItem.recordId, ...location } : null;
};
