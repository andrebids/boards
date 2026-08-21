const { hasCodexUsageBridgeToken } = require('../../../utils/codex-usage-bridge');
const { normalizeCodexUsage } = require('../../../utils/codex-usage');
const { getGlobalDashboard } = require('../../../utils/dashboard');

const Errors = {
  INVALID_USAGE: { invalidCodexUsage: 'The Codex usage snapshot is invalid' },
  UNAUTHORIZED: { unauthorized: 'The Codex usage bridge token is invalid' },
};

module.exports = {
  inputs: {
    resetsAt: { type: 'number', required: true },
    usedPercent: { type: 'number', required: true },
    windowDurationMins: { type: 'number', required: true },
  },

  exits: {
    invalidUsage: { responseType: 'badRequest' },
    unauthorized: { responseType: 'unauthorized' },
  },

  async fn(inputs) {
    if (
      !hasCodexUsageBridgeToken(
        this.req.headers.authorization,
        sails.config.custom.codexUsageBridgeToken,
      )
    ) {
      throw Errors.UNAUTHORIZED;
    }

    let codexUsage;
    try {
      codexUsage = normalizeCodexUsage(inputs);
    } catch (error) {
      throw Errors.INVALID_USAGE;
    }

    const dashboard = await getGlobalDashboard();
    await Dashboard.updateOne({ id: dashboard.id }).set({ codexUsage });

    sails.sockets.broadcast('dashboard', 'dashboardCodexUsageUpdate', { item: codexUsage });
    return { item: codexUsage };
  },
};
