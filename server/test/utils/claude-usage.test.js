const { expect } = require('chai');

const { normalizeClaudeUsage } = require('../../utils/claude-usage');

const NOW = new Date('2026-09-14T12:00:00.000Z');

const createTokenActivity = () => ({
  summary: {
    totalTokens: 1200,
    peakDailyTokens: 900,
    currentStreakDays: 2,
    longestStreakDays: 4,
    lifetimeTokens: 999,
  },
  dailyUsageBuckets: [{ startDate: '2026-09-14', tokens: 900, model: 'ignored' }],
  capturedAt: '2026-09-14T11:59:00.000Z',
});

describe('Claude usage snapshot', () => {
  it('keeps only the documented subscription windows and local token activity', () => {
    expect(
      normalizeClaudeUsage(
        {
          apiCostUsd: 12,
          rateLimits: {
            fiveHour: { usedPercent: 23.5, resetsAt: 1789750800, extra: true },
            sevenDay: { usedPercent: 41.2, resetsAt: 1790200000 },
            spendLimit: { usedPercent: 120, resetsAt: 1790200000 },
            capturedAt: '2026-09-14T11:58:00.000Z',
            claudeCodeVersion: '2.1.270',
          },
          tokenActivity: createTokenActivity(),
        },
        NOW,
      ),
    ).to.deep.equal({
      rateLimits: {
        fiveHour: { usedPercent: 23.5, resetsAt: 1789750800 },
        sevenDay: { usedPercent: 41.2, resetsAt: 1790200000 },
        capturedAt: '2026-09-14T11:58:00.000Z',
        claudeCodeVersion: '2.1.270',
      },
      tokenActivity: {
        source: 'claudeCodeLocalTranscripts',
        summary: {
          totalTokens: 1200,
          peakDailyTokens: 900,
          currentStreakDays: 2,
          longestStreakDays: 4,
        },
        dailyUsageBuckets: [{ startDate: '2026-09-14', tokens: 900 }],
        capturedAt: '2026-09-14T11:59:00.000Z',
      },
      updatedAt: '2026-09-14T12:00:00.000Z',
    });
  });

  it('accepts a snapshot where one limit window or all limits are absent', () => {
    const usage = normalizeClaudeUsage(
      {
        rateLimits: {
          sevenDay: { usedPercent: 10, resetsAt: 1790200000 },
          capturedAt: '2026-09-14T11:58:00.000Z',
        },
      },
      NOW,
    );

    expect(usage.rateLimits.fiveHour).to.equal(null);
    expect(usage.tokenActivity).to.equal(null);
    expect(normalizeClaudeUsage({ tokenActivity: createTokenActivity() }, NOW).rateLimits).to.equal(
      null,
    );
  });

  it('rejects values outside the contract', () => {
    const capturedAt = '2026-09-14T11:58:00.000Z';

    expect(() => normalizeClaudeUsage({}, NOW)).to.throw('rate limits or token activity');
    expect(() =>
      normalizeClaudeUsage(
        {
          rateLimits: {
            fiveHour: { usedPercent: 101, resetsAt: 1789750800 },
            capturedAt,
          },
        },
        NOW,
      ),
    ).to.throw('fiveHour.usedPercent');
    expect(() =>
      normalizeClaudeUsage(
        {
          rateLimits: {
            sevenDay: { usedPercent: 1, resetsAt: '2026-09-15' },
            capturedAt,
          },
        },
        NOW,
      ),
    ).to.throw('sevenDay.resetsAt');
    expect(() => normalizeClaudeUsage({ rateLimits: { capturedAt } }, NOW)).to.throw(
      'at least one window',
    );
    expect(() =>
      normalizeClaudeUsage(
        {
          rateLimits: {
            sevenDay: { usedPercent: 1, resetsAt: 1790200000 },
            capturedAt: '2026-09-15T12:00:00.000Z',
          },
        },
        NOW,
      ),
    ).to.throw('capturedAt');
    expect(() =>
      normalizeClaudeUsage(
        {
          tokenActivity: {
            ...createTokenActivity(),
            dailyUsageBuckets: [{ startDate: 'ontem', tokens: 1 }],
          },
        },
        NOW,
      ),
    ).to.throw('daily bucket');
  });
});
