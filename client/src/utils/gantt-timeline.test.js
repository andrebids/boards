import createGanttCurrentTimeMarker, { getGanttTitleMarqueeMetrics } from './gantt-timeline';

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

describe('Gantt current time marker', () => {
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
