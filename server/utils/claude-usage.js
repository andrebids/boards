// Claude.ai subscription limits come from the documented Claude Code status line `rate_limits`
// object. Token activity is a local estimate from Claude Code transcripts on the bridge computer.
// Neither value describes API-billed usage.
const RATE_LIMIT_WINDOWS = ['fiveHour', 'sevenDay'];
const TOKEN_ACTIVITY_SUMMARY_FIELDS = [
  'totalTokens',
  'peakDailyTokens',
  'currentStreakDays',
  'longestStreakDays',
];
const MAX_DAILY_USAGE_BUCKETS = 400;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_VERSION_LENGTH = 40;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseTimestamp = (value, label, now) => {
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + MAX_CLOCK_SKEW_MS) {
    throw new Error(`Claude usage ${label} must be a past ISO date`);
  }

  return new Date(timestamp).toISOString();
};

const normalizeRateLimitWindow = (window, name) => {
  if (window === null || window === undefined) {
    return null;
  }

  if (!isPlainObject(window)) {
    throw new Error(`Claude usage ${name} must be an object`);
  }

  const { usedPercent, resetsAt } = window;
  if (!Number.isFinite(usedPercent) || usedPercent < 0 || usedPercent > 100) {
    throw new Error(`Claude usage ${name}.usedPercent must be between 0 and 100`);
  }

  if (!Number.isSafeInteger(resetsAt) || resetsAt <= 0) {
    throw new Error(`Claude usage ${name}.resetsAt must be a Unix timestamp`);
  }

  return { usedPercent, resetsAt };
};

const normalizeRateLimits = (rateLimits, now) => {
  if (rateLimits === null || rateLimits === undefined) {
    return null;
  }

  if (!isPlainObject(rateLimits)) {
    throw new Error('Claude usage rateLimits must be an object');
  }

  const windows = Object.fromEntries(
    RATE_LIMIT_WINDOWS.map((name) => [name, normalizeRateLimitWindow(rateLimits[name], name)]),
  );
  if (RATE_LIMIT_WINDOWS.every((name) => windows[name] === null)) {
    throw new Error('Claude usage rateLimits must contain at least one window');
  }

  const { claudeCodeVersion } = rateLimits;
  if (
    claudeCodeVersion !== undefined &&
    (typeof claudeCodeVersion !== 'string' ||
      claudeCodeVersion.length > MAX_VERSION_LENGTH ||
      !/^[\w.+-]+$/.test(claudeCodeVersion))
  ) {
    throw new Error('Claude usage claudeCodeVersion is invalid');
  }

  return {
    ...windows,
    capturedAt: parseTimestamp(rateLimits.capturedAt, 'rateLimits.capturedAt', now),
    ...(claudeCodeVersion ? { claudeCodeVersion } : {}),
  };
};

const normalizeTokenActivity = (tokenActivity, now) => {
  if (tokenActivity === null || tokenActivity === undefined) {
    return null;
  }

  if (!isPlainObject(tokenActivity) || !isPlainObject(tokenActivity.summary)) {
    throw new Error('Claude token activity must contain a summary object');
  }

  const { summary, dailyUsageBuckets } = tokenActivity;
  const invalidSummaryField = TOKEN_ACTIVITY_SUMMARY_FIELDS.find(
    (field) => !Number.isSafeInteger(summary[field]) || summary[field] < 0,
  );
  if (invalidSummaryField) {
    throw new Error(`Claude token activity ${invalidSummaryField} must be a non-negative integer`);
  }

  if (!Array.isArray(dailyUsageBuckets) || dailyUsageBuckets.length > MAX_DAILY_USAGE_BUCKETS) {
    throw new Error('Claude token activity daily buckets are invalid');
  }

  const hasInvalidBucket = dailyUsageBuckets.some(
    (bucket) =>
      !isPlainObject(bucket) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(bucket.startDate) ||
      !Number.isSafeInteger(bucket.tokens) ||
      bucket.tokens < 0,
  );
  if (hasInvalidBucket) {
    throw new Error('Claude token activity daily bucket is invalid');
  }

  return {
    source: 'claudeCodeLocalTranscripts',
    summary: Object.fromEntries(
      TOKEN_ACTIVITY_SUMMARY_FIELDS.map((field) => [field, summary[field]]),
    ),
    dailyUsageBuckets: dailyUsageBuckets.map(({ startDate, tokens }) => ({
      startDate,
      tokens,
    })),
    capturedAt: parseTimestamp(tokenActivity.capturedAt, 'tokenActivity.capturedAt', now),
  };
};

const normalizeClaudeUsage = (usage, updatedAt = new Date()) => {
  if (!isPlainObject(usage)) {
    throw new Error('Claude usage must be an object');
  }

  if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
    throw new Error('Claude usage updatedAt must be a valid date');
  }

  const rateLimits = normalizeRateLimits(usage.rateLimits, updatedAt);
  const tokenActivity = normalizeTokenActivity(usage.tokenActivity, updatedAt);
  if (!rateLimits && !tokenActivity) {
    throw new Error('Claude usage must contain rate limits or token activity');
  }

  return {
    rateLimits,
    tokenActivity,
    updatedAt: updatedAt.toISOString(),
  };
};

module.exports = { normalizeClaudeUsage };
