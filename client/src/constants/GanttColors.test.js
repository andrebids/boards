/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { buildGanttTaskColorStyles } from './GanttColors';

test('builds persistent color rules for virtualized task bars', () => {
  const styles = buildGanttTaskColorStyles([
    { id: 'task-1', color: 'green', type: 'task' },
    { id: 'summary-1', color: 'purple', type: 'summary' },
  ]);

  expect(styles).toContain('.wx-bar[data-task-id="task-1"] { --wx-gantt-task-color: #2fa36b;');
  expect(styles).toContain(
    '.wx-bar[data-task-id="summary-1"] { --wx-gantt-summary-color: #8b5cf6;',
  );
});
