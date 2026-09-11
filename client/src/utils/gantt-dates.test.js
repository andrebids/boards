import { addGanttBusinessDays, countGanttBusinessDays, updateGanttSchedule } from './gantt-dates';

describe('Gantt business days', () => {
  test('skips weekends when calculating the end date', () => {
    expect(addGanttBusinessDays('2026-08-14', 1)).toBe('2026-08-17');
    expect(addGanttBusinessDays('2026-08-10', 4)).toBe('2026-08-14');
  });

  test('counts only weekdays in an existing interval', () => {
    expect(countGanttBusinessDays('2026-08-10', '2026-08-16')).toBe(5);
  });

  test('schedules fifteen days and normalizes weekend starts', () => {
    expect(addGanttBusinessDays('2026-09-07', 14)).toBe('2026-09-25');
    expect(addGanttBusinessDays('2026-09-12', 0)).toBe('2026-09-14');
    expect(countGanttBusinessDays('2026-09-07', '2026-09-25')).toBe(15);
  });
});

describe('Gantt scheduling from an estimate', () => {
  const estimate = { expectedDurationDays: 3, startDate: '', endDate: '' };
  test('preserves the estimate through scheduling, moving and unscheduling', () => {
    const scheduled = updateGanttSchedule(estimate, { startDate: '2026-09-14' });
    expect(scheduled.endDate).toBe('2026-09-16');
    const moved = updateGanttSchedule(scheduled, { startDate: '2026-09-18' });
    expect(moved).toEqual({
      startDate: '2026-09-18',
      endDate: '2026-09-22',
      expectedDurationDays: 3,
    });
    expect(updateGanttSchedule(moved, { startDate: '' })).toEqual(estimate);
    expect(updateGanttSchedule(estimate, { expectedDurationDays: 15 })).toEqual({
      ...estimate,
      expectedDurationDays: 15,
    });
  });
  test('uses the edited field as authority without hiding invalid end dates', () => {
    const scheduled = updateGanttSchedule(estimate, { startDate: '2026-09-14' });
    expect(updateGanttSchedule(scheduled, { expectedDurationDays: 5 }).endDate).toBe('2026-09-18');
    expect(updateGanttSchedule(scheduled, { endDate: '2026-09-21' }).expectedDurationDays).toBe(6);
    expect(updateGanttSchedule(scheduled, { endDate: '' }).endDate).toBe('');
    expect(updateGanttSchedule(scheduled, { endDate: '2026-09-13' }).expectedDurationDays).toBe(3);
  });
  test.each([
    ['2026-09-12', 1, '2026-09-14', '2026-09-14'],
    ['2026-09-07', 15, '2026-09-07', '2026-09-25'],
    ['2026-12-31', 3, '2026-12-31', '2027-01-04'],
    ['2026-03-27', 3, '2026-03-27', '2026-03-31'],
    ['2026-10-23', 3, '2026-10-23', '2026-10-27'],
  ])(
    'schedules %s for %i business days across calendar boundaries',
    (start, duration, startDate, endDate) => {
      expect(updateGanttSchedule({ expectedDurationDays: duration }, { startDate: start })).toEqual(
        {
          startDate,
          endDate,
          expectedDurationDays: duration,
        },
      );
    },
  );
});
