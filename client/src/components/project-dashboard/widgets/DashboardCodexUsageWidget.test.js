import {
  buildActivityCalendar,
  getActivityCalendarWeeks,
  getActivityLevel,
} from './codex-usage-activity';

describe('DashboardCodexUsageWidget token activity', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-27T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at the first month with token activity', () => {
    const calendar = buildActivityCalendar([
      { startDate: '2026-05-11', tokens: 100 },
      { startDate: '2026-06-02', tokens: 200 },
      { startDate: '2026-08-26', tokens: 300 },
    ]);

    expect(calendar.focusedMonthLabel).toBe('maio');
    expect(calendar.monthMarks.map(({ label }) => label)).toEqual(['mai', 'jun', 'jul', 'ago']);
    expect(calendar.weeks.flat().some(({ dateKey }) => dateKey === '2026-05-01')).toBe(true);
    expect(calendar.weeks.flat().some(({ dateKey }) => dateKey === '2026-04-01')).toBe(false);
  });

  it('keeps low token days distinct from the peak', () => {
    expect(getActivityLevel(0, 10_000)).toBe(0);
    expect(getActivityLevel(50, 10_000)).toBe(1);
    expect(getActivityLevel(200, 10_000)).toBe(2);
    expect(getActivityLevel(1_000, 10_000)).toBe(3);
    expect(getActivityLevel(2_000, 10_000)).toBe(4);
    expect(getActivityLevel(5_000, 10_000)).toBe(5);
    expect(getActivityLevel(10_000, 10_000)).toBe(6);
  });

  it('keeps calendar cells readable by reducing the visible period', () => {
    expect(getActivityCalendarWeeks(320)).toBe(14);
    expect(getActivityCalendarWeeks(605)).toBe(27);
    expect(getActivityCalendarWeeks(950)).toBe(53);
  });

  it('keeps only the most recent calendar weeks', () => {
    const calendar = buildActivityCalendar(
      [
        { startDate: '2026-05-11', tokens: 100 },
        { startDate: '2026-08-26', tokens: 300 },
      ],
      14,
    );

    expect(calendar.weeks).toHaveLength(14);
    expect(calendar.weeks.flat().some(({ dateKey }) => dateKey === '2026-05-11')).toBe(false);
    expect(calendar.weeks.flat().some(({ dateKey }) => dateKey === '2026-08-26')).toBe(true);
  });
});
