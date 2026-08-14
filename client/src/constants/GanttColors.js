/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const GANTT_COLORS = {
  blue: '#3983eb',
  green: '#2fa36b',
  orange: '#d9822b',
  red: '#d64545',
  purple: '#8b5cf6',
  teal: '#0f9f9a',
  gray: '#697386',
};

export const buildGanttTaskColorStyles = (tasks) =>
  tasks
    .map((task) => {
      const id = String(task.id).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
      const color = GANTT_COLORS[task.color] || GANTT_COLORS.blue;
      const prefix = task.type === 'summary' ? 'summary' : 'task';

      return `[data-gantt-color-scope] .wx-bar[data-task-id="${id}"] { --wx-gantt-${prefix}-color: ${color}; --wx-gantt-${prefix}-fill-color: ${color}; --wx-gantt-${prefix}-border-color: ${color}; }`;
    })
    .join('\n');

export default GANTT_COLORS;
