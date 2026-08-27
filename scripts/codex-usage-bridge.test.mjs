import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPlankaUsageUrl,
  extractTokenActivity,
  extractWeeklyUsage,
} from './codex-usage-bridge.mjs';

test('extracts only the primary Codex weekly usage window', () => {
  assert.deepEqual(
    extractWeeklyUsage({
      rateLimitsByLimitId: {
        codex: {
          planType: 'pro',
          primary: {
            resetsAt: 1787812769,
            usedPercent: 12,
            windowDurationMins: 10080,
          },
          secondary: { usedPercent: 30 },
        },
      },
    }),
    {
      resetsAt: 1787812769,
      usedPercent: 12,
      windowDurationMins: 10080,
    },
  );
});

test('extracts the Codex token activity summary and daily buckets', () => {
  assert.deepEqual(
    extractTokenActivity({
      summary: {
        lifetimeTokens: 31_700_000_000,
        peakDailyTokens: 2_000_000_000,
        longestRunningTurnSec: 83815,
        currentStreakDays: 3,
        longestStreakDays: 33,
      },
      dailyUsageBuckets: [
        { startDate: '2026-08-25', tokens: 1_049_098_881 },
        { startDate: '2026-08-26', tokens: 1_028_139_962 },
      ],
    }),
    {
      summary: {
        lifetimeTokens: 31_700_000_000,
        peakDailyTokens: 2_000_000_000,
        longestRunningTurnSec: 83815,
        currentStreakDays: 3,
        longestStreakDays: 33,
      },
      dailyUsageBuckets: [
        { startDate: '2026-08-25', tokens: 1_049_098_881 },
        { startDate: '2026-08-26', tokens: 1_028_139_962 },
      ],
    },
  );
});

test('uses a secure Planka URL while allowing local development', () => {
  assert.equal(
    createPlankaUsageUrl('https://boards.example.test/planka').toString(),
    'https://boards.example.test/planka/api/dashboard/codex-usage',
  );
  assert.equal(
    createPlankaUsageUrl('http://localhost:3008').toString(),
    'http://localhost:3008/api/dashboard/codex-usage',
  );
  assert.equal(
    createPlankaUsageUrl('http://[::1]:3008').toString(),
    'http://[::1]:3008/api/dashboard/codex-usage',
  );
  assert.throws(() => createPlankaUsageUrl('http://boards.example.test'), /HTTPS/);
});
