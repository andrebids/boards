import { addGanttBusinessDays, countGanttBusinessDays } from './gantt-dates';

describe('Gantt business days', () => {
  test('skips weekends when calculating the end date', () => {
    expect(addGanttBusinessDays('2026-08-14', 1)).toBe('2026-08-17');
    expect(addGanttBusinessDays('2026-08-10', 4)).toBe('2026-08-14');
  });

  test('counts only weekdays in an existing interval', () => {
    expect(countGanttBusinessDays('2026-08-10', '2026-08-16')).toBe(5);
  });
});
