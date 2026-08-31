/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import buildTaskDragStyle from './task-drag-style';

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
