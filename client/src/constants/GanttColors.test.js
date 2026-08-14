/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { buildGanttTaskColorStyles, GANTT_STATUS_COLORS, getGanttStatusColor } from './GanttColors';

test('uses the vivid status palette based on the original Gantt colors', () => {
  expect(GANTT_STATUS_COLORS).toEqual({
    notStarted: 'oklch(0.72 0.025 260)',
    inProgress: 'oklch(0.703 0.143 240.76)',
    testing: 'oklch(0.686 0.144 60.43)',
    completed: 'oklch(0.702 0.137 171.214)',
  });
});

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
    `.wx-bar[data-task-id=":task-1"] { --wx-gantt-task-color: ${GANTT_STATUS_COLORS.testing};`,
  );
  expect(styles).toContain(
    `.wx-bar[data-task-id=":summary-1"] { --wx-gantt-summary-color: ${GANTT_STATUS_COLORS.completed};`,
  );
  expect(styles).toContain(
    `.wx-bar[data-task-id=":linked-1"] { --wx-gantt-task-color: ${GANTT_STATUS_COLORS.notStarted};`,
  );
  expect(styles).toContain('--wx-gantt-task-font-color: var(--app-dark-text);');
  expect(styles).toContain('--wx-gantt-task-border-color: transparent;');
  expect(styles).toContain('--wx-gantt-task-border: none;');
});

test('falls back to the visible not-started color', () => {
  expect(getGanttStatusColor('unknown')).toBe(GANTT_STATUS_COLORS.notStarted);
});
