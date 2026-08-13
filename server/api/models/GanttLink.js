/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'gantt_link',

  attributes: {
    type: {
      type: 'string',
      defaultsTo: 'e2s',
    },
    ganttPlanId: {
      model: 'GanttPlan',
      required: true,
      columnName: 'gantt_plan_id',
    },
    sourceItemId: {
      model: 'GanttItem',
      required: true,
      columnName: 'source_item_id',
    },
    targetItemId: {
      model: 'GanttItem',
      required: true,
      columnName: 'target_item_id',
    },
  },
};
