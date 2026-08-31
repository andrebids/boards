/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import buildTaskDragStyle, { getTaskVisualDepth } from './task-drag-style';

describe('getTaskVisualDepth', () => {
  it('keeps the last preview depth while the successful drop animation finishes', () => {
    expect(getTaskVisualDepth('task-1', 0, 2, null, true)).toBe(2);
  });

  it('returns to the source depth when the drop is cancelled', () => {
    expect(getTaskVisualDepth('task-1', 0, 2, { taskId: 'task-1', isCancelled: true }, true)).toBe(
      0,
    );
  });
});

describe('buildTaskDragStyle', () => {
  it('keeps a combined task visible and resizes it for the preview depth', () => {
    expect(
      buildTaskDragStyle(
        {
          opacity: 0,
          transform: 'translate(10px, 20px) scale(0.75)',
          transition: 'transform 0.33s ease, opacity 0.33s ease',
          width: 240,
        },
        1,
        2,
      ),
    ).toMatchObject({
      opacity: 1,
      transform: 'translate(10px, 20px)',
      width: 216,
      '--task-depth': 2,
    });
  });
});
