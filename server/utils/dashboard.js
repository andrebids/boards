const GLOBAL_DASHBOARD_KEY = 'global';
const EDIT_LOCK_DURATION_MS = 60000;

const getGlobalDashboard = async () => {
  let dashboard = await Dashboard.findOne({ key: GLOBAL_DASHBOARD_KEY });

  if (dashboard) {
    return dashboard;
  }

  try {
    dashboard = await Dashboard.create({ key: GLOBAL_DASHBOARD_KEY }).fetch();
  } catch (error) {
    dashboard = await Dashboard.findOne({ key: GLOBAL_DASHBOARD_KEY });
  }

  return dashboard;
};

const isDashboardAdmin = (user) => user && user.role === User.Roles.ADMIN;

const isEditLockActive = (dashboard, now = new Date()) =>
  Boolean(
    dashboard.editLockUserId &&
      dashboard.editLockExpiresAt &&
      new Date(dashboard.editLockExpiresAt).getTime() > now.getTime(),
  );

const createEditLockValues = (userId) => ({
  editLockUserId: userId,
  editLockExpiresAt: new Date(Date.now() + EDIT_LOCK_DURATION_MS).toISOString(),
});

module.exports = {
  createEditLockValues,
  getGlobalDashboard,
  isDashboardAdmin,
  isEditLockActive,
};
