import { buildActivityCalendar } from './codex-usage-activity';

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
});
