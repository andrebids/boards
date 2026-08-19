module.exports = {
  tableName: 'project_dashboard',

  attributes: {
    projectId: {
      model: 'Project',
      required: true,
      unique: true,
      columnName: 'project_id',
    },
    isEnabled: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'is_enabled',
    },
    layout: {
      type: 'json',
      defaultsTo: [],
    },
    version: {
      type: 'number',
      defaultsTo: 1,
    },
    members: {
      collection: 'ProjectDashboardMember',
      via: 'projectDashboardId',
    },
  },
};
