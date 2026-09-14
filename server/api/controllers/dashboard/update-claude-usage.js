const { hasCodexUsageBridgeToken } = require('../../../utils/codex-usage-bridge');
const { normalizeClaudeUsage } = require('../../../utils/claude-usage');
const { getGlobalDashboard } = require('../../../utils/dashboard');

const Errors = {
  INVALID_USAGE: { invalidClaudeUsage: 'The Claude usage snapshot is invalid' },
  UNAUTHORIZED: { unauthorized: 'The Claude usage bridge token is invalid' },
};

module.exports = {
  inputs: {
    rateLimits: { type: 'json', required: false },
    tokenActivity: { type: 'json', required: false },
  },

  exits: {
    invalidUsage: { responseType: 'badRequest' },
    unauthorized: { responseType: 'unauthorized' },
  },

  async fn(inputs) {
    if (
      !hasCodexUsageBridgeToken(
        this.req.headers.authorization,
        sails.config.custom.claudeUsageBridgeToken,
      )
    ) {
      throw Errors.UNAUTHORIZED;
    }

    let claudeUsage;
    try {
      claudeUsage = normalizeClaudeUsage(inputs);
    } catch (error) {
      throw Errors.INVALID_USAGE;
    }

    const dashboard = await getGlobalDashboard();
    await Dashboard.updateOne({ id: dashboard.id }).set({ claudeUsage });

    sails.sockets.broadcast('dashboard', 'dashboardClaudeUsageUpdate', {
      item: claudeUsage,
    });
    return { item: claudeUsage };
  },
};
