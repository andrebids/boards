const CALENDAR_DAYS = 365;
const CALENDAR_WEEKS = 53;
const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date) => date.toISOString().slice(0, 10);

const buildActivityCalendar = (dailyUsageBuckets) => {
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
  const weeks = [];
  const cursor = new Date(gridStartDate);

  while (cursor <= endDate && weeks.length < CALENDAR_WEEKS) {
    const week = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(cursor);
      date.setUTCDate(cursor.getUTCDate() + day);
      const dateKey = toDateKey(date);
      const tokens = tokensByDate.get(dateKey) || 0;
      week.push({ dateKey, date, tokens });
    }
    weeks.push(week);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const peak = Math.max(0, ...weeks.flat().map(({ tokens }) => tokens));
  const focusedMonthLabel = firstActivityDate
    ? new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(startDate)
    : null;
  const monthMarks = [];
  const monthCursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (monthCursor <= endDate) {
    monthMarks.push({
      index: Math.floor((monthCursor.getTime() - gridStartDate.getTime()) / DAY_MS / 7),
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

  return Math.max(1, Math.ceil((Math.log1p(tokens) / Math.log1p(peak)) * 4));
};

export { buildActivityCalendar, getActivityLevel };
