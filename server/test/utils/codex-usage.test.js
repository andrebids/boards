const { expect } = require('chai');

const { hasCodexUsageBridgeToken } = require('../../utils/codex-usage-bridge');
const { normalizeCodexUsage } = require('../../utils/codex-usage');

describe('Codex usage snapshot', () => {
  it('keeps only the weekly usage values accepted from the local bridge', () => {
    expect(
      normalizeCodexUsage(
        {
          planType: 'pro',
          resetsAt: 1787812769,
          usedPercent: 12,
          windowDurationMins: 10080,
        },
        new Date('2026-08-21T08:00:00.000Z'),
      ),
    ).to.deep.equal({
      resetsAt: 1787812769,
      updatedAt: '2026-08-21T08:00:00.000Z',
      usedPercent: 12,
      windowDurationMins: 10080,
    });
  });

  it('rejects values outside the weekly usage contract', () => {
    expect(() =>
      normalizeCodexUsage({
        resetsAt: 1787812769,
        usedPercent: 101,
        windowDurationMins: 10080,
      }),
    ).to.throw('usedPercent');

    expect(() =>
      normalizeCodexUsage({
        resetsAt: 'tomorrow',
        usedPercent: 12,
        windowDurationMins: 10080,
      }),
    ).to.throw('resetsAt');
  });

  it('accepts only the configured bridge bearer token', () => {
    expect(hasCodexUsageBridgeToken('Bearer bridge-secret', 'bridge-secret')).to.equal(true);
    expect(hasCodexUsageBridgeToken('Bearer wrong-secret', 'bridge-secret')).to.equal(false);
    expect(hasCodexUsageBridgeToken(undefined, 'bridge-secret')).to.equal(false);
    expect(hasCodexUsageBridgeToken('Bearer bridge-secret', '')).to.equal(false);
  });
});
