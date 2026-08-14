/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { getEffectiveGanttStatus, normalizeGanttStatus } from './GanttStatuses';

export const GANTT_STATUS_COLORS = {
  notStarted: 'oklch(0.72 0.025 260)',
  inProgress: 'oklch(0.617 0.173 257.6)',
  testing: 'oklch(0.686 0.144 60.43)',
  completed: 'oklch(0.638 0.133 157.6)',
};

export const getGanttStatusColor = (status) =>
  GANTT_STATUS_COLORS[normalizeGanttStatus(status)] || GANTT_STATUS_COLORS.notStarted;

export const buildGanttTaskColorStyles = (tasks) =>
  tasks
    .map((task) => {
      const id = String(task.id).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
      const color = getGanttStatusColor(getEffectiveGanttStatus(task));
      const border = `color-mix(in oklab, ${color} 78%, var(--app-dark-text) 22%)`;
      const prefix = task.type === 'summary' ? 'summary' : 'task';

      return `[data-gantt-color-scope] .wx-bar[data-task-id="${id}"] { --wx-gantt-${prefix}-color: ${color}; --wx-gantt-${prefix}-fill-color: ${color}; --wx-gantt-${prefix}-font-color: var(--app-dark-canvas); --wx-gantt-${prefix}-border-color: ${border}; --wx-gantt-${prefix}-border: 1px solid ${border}; }`;
    })
    .join('\n');

export default GANTT_STATUS_COLORS;
