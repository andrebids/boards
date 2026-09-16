const MINUTE_MS = 60 * 1000;

// Claude Code only refreshes `rate_limits` while a session is active, so readings age quickly.
export const CLAUDE_LIMITS_STALE_AFTER_MS = 30 * MINUTE_MS;
// The bridge runs at most once per minute while Claude Code is active.
export const CLAUDE_BRIDGE_STALE_AFTER_MS = 6 * 60 * MINUTE_MS;

const parseMs = (value) => {
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const formatElapsed = (fromMs, nowMs) => {
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - fromMs) / MINUTE_MS));
  if (elapsedMinutes < 1) {
    return 'now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 48) {
    return `${elapsedHours}h ago`;
  }

  return `${Math.floor(elapsedHours / 24)}d ago`;
};

export const formatCountdown = (resetsAt, nowMs) => {
  if (!Number.isSafeInteger(resetsAt) || !Number.isFinite(nowMs)) {
    return null;
  }

  const remainingMinutes = Math.ceil((resetsAt * 1000 - nowMs) / MINUTE_MS);
  if (remainingMinutes <= 0) {
    return 'now';
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

// A window whose reset time has passed no longer describes current usage: hide its percentage.
export const getLimitWindowState = (window, nowMs) => {
  if (
    !window ||
    !Number.isFinite(window.usedPercent) ||
    !Number.isSafeInteger(window.resetsAt) ||
    !Number.isFinite(nowMs)
  ) {
    return { status: 'unavailable' };
  }

  if (window.resetsAt * 1000 <= nowMs) {
    return { status: 'reset' };
  }

  const usedPercent = Math.min(100, Math.max(0, Math.round(window.usedPercent)));
  return {
    status: 'available',
    usedPercent,
    remainingPercent: 100 - usedPercent,
    resetsAt: window.resetsAt,
    countdown: formatCountdown(window.resetsAt, nowMs),
  };
};

export const getClaudeUsageStatus = ({ usage, hasLoadError, nowMs }) => {
  const updatedAtMs = parseMs(usage?.updatedAt);
  const limitsCapturedAtMs = parseMs(usage?.rateLimits?.capturedAt);

  if (hasLoadError) {
    return {
      tone: 'error',
      label: updatedAtMs
        ? `Update failed · last received ${formatElapsed(updatedAtMs, nowMs)}`
        : 'Unable to reach the server',
    };
  }

  if (!usage || !updatedAtMs) {
    return { tone: 'warning', label: 'No bridge data yet' };
  }

  if (nowMs - updatedAtMs > CLAUDE_BRIDGE_STALE_AFTER_MS) {
    return {
      tone: 'warning',
      label: `No bridge update · last received ${formatElapsed(updatedAtMs, nowMs)}`,
    };
  }

  if (!limitsCapturedAtMs) {
    return { tone: 'warning', label: 'Limits not yet read by Claude Code' };
  }

  return nowMs - limitsCapturedAtMs > CLAUDE_LIMITS_STALE_AFTER_MS
    ? { tone: 'warning', label: '' }
    : { tone: 'ok', label: '' };
};
