import createGanttCurrentTimeMarker, {
  getGanttCenteredScrollLeft,
  getGanttTitleMarqueeMetrics,
  getGanttDropSchedule,
} from './gantt-timeline';
import { parseGanttDate, formatGanttDate, differenceInGanttDays } from './gantt-dates';

describe('Gantt task title marquee', () => {
  test('uses a constant reading speed only when the title overflows', () => {
    expect(getGanttTitleMarqueeMetrics(180, 100)).toEqual({
      distance: 204,
      duration: 6.375,
      gap: 24,
    });
    expect(getGanttTitleMarqueeMetrics(100, 100)).toBeNull();
  });
});

describe('External Gantt scheduling', () => {
  const scales = {
    start: parseGanttDate('2026-09-01'),
    end: parseGanttDate('2026-11-01'),
    width: 600,
    // Equal-width month columns: September and October have different daily widths.
    diff: (date) => date.getMonth() - 8 + (date.getDate() - 1) / (date.getMonth() === 8 ? 30 : 31),
  };
  test('uses the day under the pointer in variable-length month scales', () => {
    const drop = getGanttDropSchedule({ x: 430, scales, cellWidth: 300, expectedDurationDays: 3 });
    expect(drop.startDate).toBe('2026-10-14');
    expect(drop.endDate).toBe('2026-10-16');
    expect(drop.left).toBeCloseTo(300 + (13 * 300) / 31);
    expect(drop.width).toBeCloseTo((3 * 300) / 31);
  });
  test.each([36, 18, 5, 2])(
    'keeps day precision at %i pixels per day, including a scroll offset',
    (dayWidth) => {
      const dailyScale = {
        ...scales,
        width: 61 * dayWidth,
        diff: (date) => differenceInGanttDays('2026-09-01', formatGanttDate(date)),
      };
      const drop = getGanttDropSchedule({
        x: dayWidth * 13 + dayWidth / 2,
        scales: dailyScale,
        cellWidth: dayWidth,
        expectedDurationDays: 3,
      });
      expect(drop.startDate).toBe('2026-09-14');
      expect(drop.endDate).toBe('2026-09-16');
      expect(drop.width).toBe(3 * dayWidth);
    },
  );
  test('previews the next weekday for a weekend drop and extends across weekends', () => {
    const drop = getGanttDropSchedule({ x: 110, scales, cellWidth: 300, expectedDurationDays: 6 });
    expect(drop.startDate).toBe('2026-09-14');
    expect(drop.endDate).toBe('2026-09-21');
    expect(drop.width).toBeCloseTo(80);
  });
  test('rejects positions outside the scale and an uninitialized chart', () => {
    [-1, 600].forEach((x) =>
      expect(
        getGanttDropSchedule({ x, scales, cellWidth: 300, expectedDurationDays: 3 }),
      ).toBeNull(),
    );
    expect(getGanttDropSchedule({ x: 1 })).toBeNull();
  });
});

describe('Gantt current time marker', () => {
  test('centers the current time without scrolling before the timeline start', () => {
    expect(getGanttCenteredScrollLeft(700, 400)).toBe(500);
    expect(getGanttCenteredScrollLeft(100, 400)).toBe(0);
  });

  test('places the marker at the current hour instead of the start of today', () => {
    const now = new Date(2026, 7, 14, 15, 0);
    const scaleStart = new Date(2026, 7, 14);
    const scales = {
      diff: (currentTime) => currentTime.getHours() / 24,
    };

    expect(
      createGanttCurrentTimeMarker({
        scales,
        scaleStart,
        cellWidth: 240,
        now,
        text: 'Hoje',
      }),
    ).toEqual({
      left: 150,
      start: now,
      text: 'Hoje',
    });
  });
});
