const { getGlobalDashboard, isDashboardAdmin } = require('../../../utils/dashboard');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  exits: {
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn() {
    if (!isDashboardAdmin(this.req.currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const dashboard = await getGlobalDashboard();
    return { item: dashboard.codexUsage || null };
  },
};
