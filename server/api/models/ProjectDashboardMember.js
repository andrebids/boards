module.exports = {
  tableName: 'project_dashboard_member',

  attributes: {
    projectDashboardId: {
      model: 'ProjectDashboard',
      required: true,
      columnName: 'project_dashboard_id',
    },
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },
};
