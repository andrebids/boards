/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { buildTaskRows } from './task-tree';

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
});
