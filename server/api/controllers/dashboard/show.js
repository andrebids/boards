const {
  getGlobalDashboard,
  isDashboardAdmin,
  isEditLockActive,
} = require('../../../utils/dashboard');

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
    if (this.req.isSocket) {
      sails.sockets.join(this.req, 'dashboard');
    }

    return {
      item: dashboard,
      meta: {
        canEdit: !isEditLockActive(dashboard) || dashboard.editLockUserId === currentUser.id,
        isLocked: isEditLockActive(dashboard),
      },
    };
  },
};
