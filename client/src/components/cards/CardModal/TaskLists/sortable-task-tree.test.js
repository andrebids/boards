import { buildSortableTaskTree, getSortableTreeMove, makeTaskNodeId } from './sortable-task-tree';

const tasksByTaskListId = {
  listA: [
    { id: 'taskA', taskListId: 'listA', parentTaskId: null },
    { id: 'taskB', taskListId: 'listA', parentTaskId: 'taskA' },
    { id: 'taskC', taskListId: 'listA', parentTaskId: null },
  ],
  listB: [{ id: 'taskD', taskListId: 'listB', parentTaskId: null }],
};

describe('sortable task tree adapter', () => {
  test('builds list roots with nested tasks and a fixed add-task footer', () => {
    const items = buildSortableTaskTree({
      taskListIds: ['listA', 'listB'],
      tasksByTaskListId,
      collapsedTaskIdsByTaskListId: {
        listA: new Set(['taskA']),
      },
    });

    expect(items).toMatchObject([
      {
        kind: 'taskList',
        recordId: 'listA',
        children: [
          {
            kind: 'task',
            recordId: 'taskA',
            collapsed: true,
            children: [{ kind: 'task', recordId: 'taskB' }],
          },
          { kind: 'task', recordId: 'taskC' },
          { kind: 'footer', recordId: 'listA', disableSorting: true },
        ],
      },
      {
        kind: 'taskList',
        recordId: 'listB',
        children: [
          { kind: 'task', recordId: 'taskD' },
          { kind: 'footer', recordId: 'listB', disableSorting: true },
        ],
      },
    ]);
  });

  test('maps a nested cross-list drop to the existing moveTask arguments', () => {
    const items = buildSortableTaskTree({
      taskListIds: ['listA', 'listB'],
      tasksByTaskListId,
    });
    const [listA, listB] = items;
    const [taskA] = listA.children;
    const taskC = listA.children[1];
    const taskD = listB.children[0];

    listA.children = [taskA, listA.children.at(-1)];
    taskD.children = [taskC];

    expect(
      getSortableTreeMove(items, {
        type: 'dropped',
        draggedItem: { id: makeTaskNodeId('taskC'), kind: 'task', recordId: 'taskC' },
      }),
    ).toEqual({
      type: 'task',
      id: 'taskC',
      taskListId: 'listB',
      parentTaskId: 'taskD',
      index: 0,
    });
  });

  test('ignores the fixed footer when calculating a root task index', () => {
    const items = buildSortableTaskTree({
      taskListIds: ['listA', 'listB'],
      tasksByTaskListId,
    });
    const [listA, listB] = items;
    const taskC = listA.children[1];

    listA.children = [listA.children[0], listA.children.at(-1)];
    listB.children = [listB.children.at(-1), listB.children[0], taskC];

    expect(
      getSortableTreeMove(items, {
        type: 'dropped',
        draggedItem: { id: makeTaskNodeId('taskC'), kind: 'task', recordId: 'taskC' },
      }),
    ).toMatchObject({
      taskListId: 'listB',
      parentTaskId: null,
      index: 1,
    });
  });

  test('maps a list-root drop to moveTaskList', () => {
    const items = buildSortableTaskTree({
      taskListIds: ['listA', 'listB'],
      tasksByTaskListId,
    });
    items.reverse();

    expect(
      getSortableTreeMove(items, {
        type: 'dropped',
        draggedItem: { id: 'task-list:listB', kind: 'taskList', recordId: 'listB' },
      }),
    ).toEqual({ type: 'taskList', id: 'listB', index: 0 });
  });
});
