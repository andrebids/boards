/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { buildTaskRows, resolveTaskDrop } from './task-tree';

describe('buildTaskRows', () => {
  it('returns every nested task in depth-first order with its depth', () => {
    const tasks = [
      { id: 'root-1', parentTaskId: null },
      { id: 'child-1', parentTaskId: 'root-1' },
      { id: 'grandchild-1', parentTaskId: 'child-1' },
      { id: 'root-2', parentTaskId: null },
    ];

    expect(buildTaskRows(tasks)).toEqual([
      { task: tasks[0], depth: 0 },
      { task: tasks[1], depth: 1 },
      { task: tasks[2], depth: 2 },
      { task: tasks[3], depth: 0 },
    ]);
  });

  it('omits every descendant of collapsed tasks', () => {
    const tasks = [
      { id: 'root-1', parentTaskId: null },
      { id: 'child-1', parentTaskId: 'root-1' },
      { id: 'grandchild-1', parentTaskId: 'child-1' },
      { id: 'root-2', parentTaskId: null },
    ];

    expect(buildTaskRows(tasks, new Set(['root-1']))).toEqual([
      { task: tasks[0], depth: 0 },
      { task: tasks[3], depth: 0 },
    ]);
  });
});

describe('resolveTaskDrop', () => {
  const tasksByTaskListId = {
    'list-1': [
      { id: 'root-1', parentTaskId: null },
      { id: 'child-1', parentTaskId: 'root-1' },
      { id: 'grandchild-1', parentTaskId: 'child-1' },
      { id: 'root-2', parentTaskId: null },
    ],
    'list-2': [
      { id: 'root-3', parentTaskId: null },
      { id: 'child-2', parentTaskId: 'root-3' },
    ],
  };

  it('combines a task into another task as its last direct child', () => {
    expect(
      resolveTaskDrop({
        taskId: 'root-2',
        sourceTaskListId: 'list-1',
        combineTaskId: 'root-3',
        destinationTaskListId: 'list-2',
        tasksByTaskListId,
      }),
    ).toEqual({
      taskListId: 'list-2',
      parentTaskId: 'root-3',
      index: 1,
    });
  });

  it('rejects combining a task with one of its descendants', () => {
    expect(
      resolveTaskDrop({
        taskId: 'root-1',
        sourceTaskListId: 'list-1',
        combineTaskId: 'grandchild-1',
        destinationTaskListId: 'list-1',
        tasksByTaskListId,
      }),
    ).toBeNull();
  });

  it('moves a subtask after a root task and makes it a root sibling', () => {
    expect(
      resolveTaskDrop({
        taskId: 'child-1',
        sourceTaskListId: 'list-1',
        sourceIndex: 1,
        destinationTaskListId: 'list-1',
        destinationIndex: 3,
        tasksByTaskListId,
      }),
    ).toEqual({
      taskListId: 'list-1',
      parentTaskId: null,
      index: 2,
    });
  });

  it('moves a root before a nested task and adopts the nested task parent', () => {
    expect(
      resolveTaskDrop({
        taskId: 'root-2',
        sourceTaskListId: 'list-1',
        sourceIndex: 3,
        destinationTaskListId: 'list-1',
        destinationIndex: 2,
        tasksByTaskListId,
      }),
    ).toEqual({
      taskListId: 'list-1',
      parentTaskId: 'child-1',
      index: 0,
    });
  });

  it('moves a subtree to the empty space of another list as a root task', () => {
    expect(
      resolveTaskDrop({
        taskId: 'root-1',
        sourceTaskListId: 'list-1',
        sourceIndex: 0,
        destinationTaskListId: 'list-2',
        destinationIndex: 2,
        tasksByTaskListId,
      }),
    ).toEqual({
      taskListId: 'list-2',
      parentTaskId: null,
      index: 1,
    });
  });
});
