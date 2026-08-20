const { normalizeDashboardLayout } = require('../../../utils/dashboard-layout');
const {
  getGlobalDashboard,
  isDashboardAdmin,
  isEditLockActive,
} = require('../../../utils/dashboard');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  LOCK_REQUIRED: { dashboardLockRequired: 'Acquire the dashboard edit lock first' },
  CONFLICT: { conflict: 'The dashboard was updated by another user' },
  INVALID_LAYOUT: { invalidLayout: 'The dashboard layout is invalid' },
};

module.exports = {
  inputs: {
    layout: { type: 'ref', required: true },
    version: { type: 'number', required: true },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    lockRequired: { responseType: 'conflict' },
    conflict: { responseType: 'conflict' },
    invalidLayout: { responseType: 'badRequest' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    if (!isDashboardAdmin(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const dashboard = await getGlobalDashboard();
    if (!isEditLockActive(dashboard) || dashboard.editLockUserId !== currentUser.id) {
      throw Errors.LOCK_REQUIRED;
    }

    if (dashboard.version !== inputs.version) {
      throw Errors.CONFLICT;
    }

    let layout;
    try {
      layout = normalizeDashboardLayout(inputs.layout);
    } catch (error) {
      throw Errors.INVALID_LAYOUT;
    }

    const item = await Dashboard.updateOne({ id: dashboard.id, version: inputs.version }).set({
      layout,
      version: dashboard.version + 1,
    });

    if (!item) {
      throw Errors.CONFLICT;
    }

    sails.sockets.broadcast('dashboard', 'dashboardUpdate', { item });
    return { item };
  },
};
