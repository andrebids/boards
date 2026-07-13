/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Types = {
  PROJECT_GROUP: 'projectGroup',
  PROJECT_DIRECT: 'projectDirect',
  PROJECT_CUSTOM_GROUP: 'projectCustomGroup',
};

module.exports = {
  Types,

  tableName: 'chat_conversation',

  attributes: {
    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },
    directKey: {
      type: 'string',
      allowNull: true,
      columnName: 'direct_key',
    },
    lastMessageAt: {
      type: 'ref',
      columnName: 'last_message_at',
    },
    title: {
      type: 'string',
      allowNull: true,
      maxLength: 80,
    },
    archivedAt: {
      type: 'ref',
      columnName: 'archived_at',
    },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
    createdByUserId: {
      model: 'User',
      columnName: 'created_by_user_id',
    },
  },
};
