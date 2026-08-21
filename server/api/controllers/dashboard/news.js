const { getDashboardNews } = require('../../../utils/dashboard-news');
const { isDashboardAdmin } = require('../../../utils/dashboard');

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

    return { items: await getDashboardNews() };
  },
};
