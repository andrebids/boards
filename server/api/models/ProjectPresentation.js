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
    documentData: {
      type: 'json',
      columnName: 'document_data',
    },
    cryptpadEditKey: {
      type: 'string',
      allowNull: true,
      encrypt: true,
      columnName: 'cryptpad_edit_key',
    },
    cryptpadViewKey: {
      type: 'string',
      allowNull: true,
      encrypt: true,
      columnName: 'cryptpad_view_key',
    },
    cryptpadKeyVersion: {
      type: 'number',
      defaultsTo: 0,
      columnName: 'cryptpad_key_version',
    },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
    boardId: {
      model: 'Board',
      unique: true,
      columnName: 'board_id',
    },
    createdByUserId: {
      model: 'User',
      columnName: 'created_by_user_id',
    },
  },
};
