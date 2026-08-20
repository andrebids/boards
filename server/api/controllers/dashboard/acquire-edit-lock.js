const {
  createEditLockValues,
  getGlobalDashboard,
  isDashboardAdmin,
  isEditLockActive,
} = require('../../../utils/dashboard');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  LOCKED: { dashboardLocked: 'The dashboard is being edited by another user' },
};

module.exports = {
  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    locked: { responseType: 'conflict' },
  },

  async fn() {
    const { currentUser } = this.req;
    if (!isDashboardAdmin(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const dashboard = await getGlobalDashboard();
    if (isEditLockActive(dashboard) && dashboard.editLockUserId !== currentUser.id) {
      throw Errors.LOCKED;
    }

    const item = await Dashboard.updateOne({ id: dashboard.id }).set(
      createEditLockValues(currentUser.id),
    );

    sails.sockets.broadcast('dashboard', 'dashboardEditLockUpdate', { item });
    return { item };
  },
};
