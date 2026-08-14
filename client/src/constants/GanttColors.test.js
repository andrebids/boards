/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  buildGanttTaskColorStyles,
  GANTT_STATUS_COLORS,
  getGanttStatusColor,
} from './GanttColors';

test('builds status-driven color rules for virtualized task bars', () => {
  const styles = buildGanttTaskColorStyles([
    { id: 'task-1', status: 'testing', color: 'green', type: 'task' },
    { id: 'summary-1', status: 'completed', color: 'purple', type: 'summary' },
    {
      id: 'linked-1',
      status: 'testing',
      sourceTask: { isCompleted: false },
      type: 'task',
    },
  ]);

  expect(styles).toContain(
    `.wx-bar[data-task-id="task-1"] { --wx-gantt-task-color: ${GANTT_STATUS_COLORS.testing};`,
  );
  expect(styles).toContain(
    `.wx-bar[data-task-id="summary-1"] { --wx-gantt-summary-color: ${GANTT_STATUS_COLORS.completed};`,
  );
  expect(styles).toContain(
    `.wx-bar[data-task-id="linked-1"] { --wx-gantt-task-color: ${GANTT_STATUS_COLORS.notStarted};`,
  );
  expect(styles).toContain('--wx-gantt-task-font-color: var(--app-dark-canvas);');
  expect(styles).toContain('--wx-gantt-task-border: 1px solid color-mix(');
});

test('falls back to the visible not-started color', () => {
  expect(getGanttStatusColor('unknown')).toBe(GANTT_STATUS_COLORS.notStarted);
});
