const CALENDAR_DAYS = 365;
const CALENDAR_WEEKS = 53;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_LEVEL_THRESHOLDS = [0.01, 0.04, 0.12, 0.3, 0.6];
const COMPACT_CALENDAR_WEEKS = 14;
const MEDIUM_CALENDAR_WEEKS = 27;

const getActivityCalendarWeeks = (containerWidth) => {
  if (!Number.isFinite(containerWidth) || containerWidth >= 820) {
    return CALENDAR_WEEKS;
  }

  return containerWidth >= 430 ? MEDIUM_CALENDAR_WEEKS : COMPACT_CALENDAR_WEEKS;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const buildActivityCalendar = (dailyUsageBuckets, maximumWeeks = CALENDAR_WEEKS) => {
  const buckets = Array.isArray(dailyUsageBuckets) ? dailyUsageBuckets : [];
  const tokensByDate = new Map(buckets.map(({ startDate, tokens }) => [startDate, tokens]));
  const today = new Date();
  const endDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (CALENDAR_DAYS - 1));
  const defaultStartKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  const firstActivityDate = buckets.reduce((earliest, { startDate: dateKey, tokens }) => {
    if (tokens <= 0 || dateKey < defaultStartKey || dateKey > endKey) {
      return earliest;
    }

    return !earliest || dateKey < earliest ? dateKey : earliest;
  }, null);
  if (firstActivityDate) {
    startDate.setTime(new Date(`${firstActivityDate.slice(0, 7)}-01T00:00:00Z`).getTime());
  }
  const gridStartDate = new Date(startDate);
  gridStartDate.setUTCDate(gridStartDate.getUTCDate() - gridStartDate.getUTCDay());
  const allWeeks = [];
  const cursor = new Date(gridStartDate);

  while (cursor <= endDate && allWeeks.length < CALENDAR_WEEKS) {
    const week = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(cursor);
      date.setUTCDate(cursor.getUTCDate() + day);
      const dateKey = toDateKey(date);
      const tokens = tokensByDate.get(dateKey) || 0;
      week.push({ dateKey, date, tokens });
    }
    allWeeks.push(week);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const weeks = allWeeks.slice(-maximumWeeks);
  const visibleStartDate = weeks[0]?.[0].date || gridStartDate;
  const displayedStartDate = visibleStartDate > startDate ? visibleStartDate : startDate;
  const peak = Math.max(0, ...weeks.flat().map(({ tokens }) => tokens));
  const focusedMonthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(
    displayedStartDate,
  );
  const monthMarks = [];
  const monthCursor = new Date(
    Date.UTC(displayedStartDate.getUTCFullYear(), displayedStartDate.getUTCMonth(), 1),
  );
  while (monthCursor <= endDate) {
    monthMarks.push({
      index: Math.max(
        0,
        Math.floor((monthCursor.getTime() - visibleStartDate.getTime()) / DAY_MS / 7),
      ),
      label: new Intl.DateTimeFormat('pt-PT', { month: 'short' })
        .format(monthCursor)
        .replace('.', ''),
    });
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }

  return { focusedMonthLabel, monthMarks, peak, weeks };
};

const getActivityLevel = (tokens, peak) => {
  if (!tokens || !peak) {
    return 0;
  }

  const ratio = tokens / peak;
  const thresholdIndex = ACTIVITY_LEVEL_THRESHOLDS.findIndex((threshold) => ratio <= threshold);

  return thresholdIndex === -1 ? ACTIVITY_LEVEL_THRESHOLDS.length + 1 : thresholdIndex + 1;
};

export { buildActivityCalendar, getActivityCalendarWeeks, getActivityLevel };
