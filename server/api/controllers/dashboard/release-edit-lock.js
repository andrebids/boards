const { getGlobalDashboard, isDashboardAdmin } = require('../../../utils/dashboard');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  exits: {
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn() {
    const { currentUser } = this.req;
    if (!isDashboardAdmin(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const dashboard = await getGlobalDashboard();
    const item = await Dashboard.updateOne({
      id: dashboard.id,
      editLockUserId: currentUser.id,
    })
      .set({ editLockUserId: null, editLockExpiresAt: null })
      .fetch();

    if (item) {
      sails.sockets.broadcast('dashboard', 'dashboardEditLockUpdate', { item });
    }

    return { item: item || dashboard };
  },
};
