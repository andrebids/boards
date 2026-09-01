/*! Copyright (c) 2024 PLANKA Software GmbH */

module.exports = {
  tableName: 'task_assignee',

  attributes: {
    taskId: {
      model: 'Task',
      required: true,
      columnName: 'task_id',
    },
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },
};
