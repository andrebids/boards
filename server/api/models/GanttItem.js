/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Statuses = {
  NOT_STARTED: 'notStarted',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
};

module.exports = {
  Statuses,

  Types: {
    TASK: 'task',
    SUMMARY: 'summary',
  },

  tableName: 'gantt_item',

  attributes: {
    task: {
      type: 'string',
      required: true,
    },
    itemType: {
      type: 'string',
      isIn: ['task', 'summary'],
      defaultsTo: 'task',
      columnName: 'item_type',
    },
    parentId: {
      model: 'GanttItem',
      columnName: 'parent_id',
    },
    description: {
      type: 'string',
      allowNull: true,
    },
    status: {
      type: 'string',
      isIn: Object.values(Statuses),
      allowNull: true,
    },
    startDate: {
      type: 'ref',
      columnName: 'start_date',
    },
    endDate: {
      type: 'ref',
      columnName: 'end_date',
    },
    expectedDurationDays: {
      type: 'number',
      required: true,
      columnName: 'expected_duration_days',
    },
    color: {
      type: 'string',
      allowNull: true,
    },
    position: {
      type: 'number',
      required: true,
    },
    version: {
      type: 'number',
      defaultsTo: 1,
    },
    ganttPlanId: {
      model: 'GanttPlan',
      required: true,
      columnName: 'gantt_plan_id',
    },
    sourceTaskId: {
      model: 'Task',
      unique: true,
      columnName: 'source_task_id',
    },
    assignees: {
      collection: 'User',
      via: 'ganttItemId',
      through: 'GanttItemAssignee',
    },
    children: {
      collection: 'GanttItem',
      via: 'parentId',
    },
  },
};
