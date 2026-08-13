/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const ZoomLevels = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

module.exports = {
  ZoomLevels,

  tableName: 'gantt_plan',

  attributes: {
    isEnabled: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'is_enabled',
    },
    defaultZoomLevel: {
      type: 'string',
      isIn: Object.values(ZoomLevels),
      defaultsTo: ZoomLevels.WEEK,
      columnName: 'default_zoom_level',
    },
    projectId: {
      model: 'Project',
      required: true,
      unique: true,
      columnName: 'project_id',
    },
    createdByUserId: {
      model: 'User',
      columnName: 'created_by_user_id',
    },
    items: {
      collection: 'GanttItem',
      via: 'ganttPlanId',
    },
    links: {
      collection: 'GanttLink',
      via: 'ganttPlanId',
    },
  },
};
