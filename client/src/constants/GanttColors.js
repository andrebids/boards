/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { getEffectiveGanttStatus, normalizeGanttStatus } from './GanttStatuses';

export const GANTT_STATUS_COLORS = {
  notStarted: 'oklch(0.72 0.025 260)',
  inProgress: 'oklch(0.703 0.143 240.76)',
  testing: 'oklch(0.686 0.144 60.43)',
  completed: 'oklch(0.702 0.137 171.214)',
};

export const getGanttStatusColor = (status) =>
  GANTT_STATUS_COLORS[normalizeGanttStatus(status)] || GANTT_STATUS_COLORS.notStarted;

// SVAR prefixes string IDs before exposing them through data-task-id.
const getGanttDomTaskId = (id) => (typeof id === 'string' ? `:${id}` : id);

export const buildGanttTaskColorStyles = (tasks) =>
  tasks
    .map((task) => {
      const id = String(getGanttDomTaskId(task.id)).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
      const color = getGanttStatusColor(getEffectiveGanttStatus(task));
      const prefix = task.type === 'summary' ? 'summary' : 'task';

      return `[data-gantt-color-scope] .wx-bar[data-task-id="${id}"] { --wx-gantt-${prefix}-color: ${color}; --wx-gantt-${prefix}-fill-color: ${color}; --wx-gantt-${prefix}-font-color: var(--app-dark-text); --wx-gantt-${prefix}-border-color: transparent; --wx-gantt-${prefix}-border: none; }`;
    })
    .join('\n');

export default GANTT_STATUS_COLORS;
