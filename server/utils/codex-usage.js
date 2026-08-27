const MAX_WINDOW_DURATION_MINS = 7 * 24 * 60;
const MAX_DAILY_USAGE_BUCKETS = 400;

const TOKEN_ACTIVITY_SUMMARY_FIELDS = [
  'lifetimeTokens',
  'peakDailyTokens',
  'longestRunningTurnSec',
  'currentStreakDays',
  'longestStreakDays',
];

const normalizeTokenActivity = (tokenActivity) => {
  if (!tokenActivity || typeof tokenActivity !== 'object' || Array.isArray(tokenActivity)) {
    throw new Error('Codex token activity must be an object');
  }

  const { summary, dailyUsageBuckets } = tokenActivity;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new Error('Codex token activity summary must be an object');
  }

  const invalidSummaryField = TOKEN_ACTIVITY_SUMMARY_FIELDS.find(
    (field) => !Number.isSafeInteger(summary[field]) || summary[field] < 0,
  );
  if (invalidSummaryField) {
    throw new Error(`Codex token activity ${invalidSummaryField} must be a non-negative integer`);
  }

  if (!Array.isArray(dailyUsageBuckets) || dailyUsageBuckets.length > MAX_DAILY_USAGE_BUCKETS) {
    throw new Error('Codex token activity daily buckets are invalid');
  }

  const hasInvalidBucket = dailyUsageBuckets.some(
    (bucket) =>
      !bucket ||
      typeof bucket !== 'object' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(bucket.startDate) ||
      !Number.isSafeInteger(bucket.tokens) ||
      bucket.tokens < 0,
  );
  if (hasInvalidBucket) {
    throw new Error('Codex token activity daily bucket is invalid');
  }

  return {
    summary: Object.fromEntries(
      TOKEN_ACTIVITY_SUMMARY_FIELDS.map((field) => [field, summary[field]]),
    ),
    dailyUsageBuckets: dailyUsageBuckets.map(({ startDate, tokens }) => ({
      startDate,
      tokens,
    })),
  };
};

const normalizeCodexUsage = (usage, updatedAt = new Date()) => {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
    throw new Error('Codex usage must be an object');
  }

  const { resetsAt, usedPercent, windowDurationMins, tokenActivity } = usage;

  if (!Number.isFinite(usedPercent) || usedPercent < 0 || usedPercent > 100) {
    throw new Error('Codex usage usedPercent must be between 0 and 100');
  }

  if (!Number.isSafeInteger(resetsAt) || resetsAt <= 0) {
    throw new Error('Codex usage resetsAt must be a Unix timestamp');
  }

  if (
    !Number.isSafeInteger(windowDurationMins) ||
    windowDurationMins <= 0 ||
    windowDurationMins > MAX_WINDOW_DURATION_MINS
  ) {
    throw new Error('Codex usage windowDurationMins must describe a weekly window');
  }

  if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
    throw new Error('Codex usage updatedAt must be a valid date');
  }

  return {
    resetsAt,
    updatedAt: updatedAt.toISOString(),
    usedPercent,
    windowDurationMins,
    ...(tokenActivity ? { tokenActivity: normalizeTokenActivity(tokenActivity) } : {}),
  };
};

module.exports = { normalizeCodexUsage };
