/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'project_presentation',

  attributes: {
    isEnabled: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'is_enabled',
    },
    title: {
      type: 'string',
      required: true,
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
  },
};
