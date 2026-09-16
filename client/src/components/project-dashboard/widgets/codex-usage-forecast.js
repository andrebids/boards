const HOUR_MS = 60 * 60 * 1000;
const WORK_PERIODS = [
  [8, 12],
  [13, 17],
];

const getWorkingPeriods = (startMs, endMs) => {
  const periods = [];
  const day = new Date(startMs);
  day.setHours(0, 0, 0, 0);

  while (day.getTime() < endMs) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      WORK_PERIODS.forEach(([startHour, endHour]) => {
        const start = new Date(day);
        const end = new Date(day);
        start.setHours(startHour);
        end.setHours(endHour);
        const startAt = Math.max(startMs, start.getTime());
        const endAt = Math.min(endMs, end.getTime());
        if (endAt > startAt) {
          periods.push([startAt, endAt]);
        }
      });
    }
    day.setDate(day.getDate() + 1);
  }

  return periods;
};

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

  const windowStartMs = resetAtMs - windowDurationMs;
  if (updatedAtMs <= windowStartMs || updatedAtMs >= resetAtMs) {
    return null;
  }

  const elapsedMs = getWorkingPeriods(windowStartMs, updatedAtMs).reduce(
    (total, [start, end]) => total + end - start,
    0,
  );
  if (elapsedMs <= 0) {
    return null;
  }

  const usedPercentPerHour = usedPercent / (elapsedMs / HOUR_MS);
  let remainingMs = ((100 - usedPercent) / usedPercentPerHour) * HOUR_MS;
  let depletesAtMs = usedPercent === 100 ? updatedAtMs : null;
  const futurePeriods = getWorkingPeriods(updatedAtMs, resetAtMs);
  for (let index = 0; depletesAtMs === null && index < futurePeriods.length; index += 1) {
    const [start, end] = futurePeriods[index];
    if (remainingMs <= end - start) {
      depletesAtMs = start + remainingMs;
    } else {
      remainingMs -= end - start;
    }
  }

  return {
    depletesAtMs,
    isBeforeReset: depletesAtMs !== null && depletesAtMs < resetAtMs,
    usedPercentPerHour,
  };
};

export const getClaudeUsageForecast = (usage, nowMs) => {
  const weekly = usage?.rateLimits?.sevenDay;
  if (!weekly || weekly.resetsAt * 1000 <= nowMs) {
    return null;
  }

  return getCodexUsageForecast({
    ...weekly,
    updatedAt: usage.rateLimits.capturedAt,
    windowDurationMins: 7 * 24 * 60,
  });
};

export default getCodexUsageForecast;
