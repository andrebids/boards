/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
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
    progress: {
      type: 'number',
      defaultsTo: 0,
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
