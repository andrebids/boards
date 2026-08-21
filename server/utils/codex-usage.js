const MAX_WINDOW_DURATION_MINS = 7 * 24 * 60;

const normalizeCodexUsage = (usage, updatedAt = new Date()) => {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
    throw new Error('Codex usage must be an object');
  }

  const { resetsAt, usedPercent, windowDurationMins } = usage;

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
  };
};

module.exports = { normalizeCodexUsage };
