const HOUR_MS = 60 * 60 * 1000;

const getCodexUsageForecast = (usage) => {
  const { resetsAt, updatedAt, usedPercent, windowDurationMins } = usage || {};
  const resetAtMs = resetsAt * 1000;
  const updatedAtMs = Date.parse(updatedAt);
  const windowDurationMs = windowDurationMins * 60 * 1000;

  if (
    !Number.isFinite(usedPercent) ||
    usedPercent <= 0 ||
    usedPercent > 100 ||
    !Number.isFinite(resetAtMs) ||
    !Number.isFinite(updatedAtMs) ||
    !Number.isFinite(windowDurationMs) ||
    windowDurationMs <= 0
  ) {
    return null;
  }

  const elapsedMs = updatedAtMs - (resetAtMs - windowDurationMs);
  if (elapsedMs <= 0 || updatedAtMs > resetAtMs) {
    return null;
  }

  const usedPercentPerHour = usedPercent / (elapsedMs / HOUR_MS);
  const depletesAtMs = updatedAtMs + ((100 - usedPercent) / usedPercentPerHour) * HOUR_MS;

  return {
    depletesAtMs,
    isBeforeReset: depletesAtMs < resetAtMs,
    usedPercentPerHour,
  };
};

export default getCodexUsageForecast;
