import { selectTimelineData } from './ganttSelectors';

describe('selectTimelineData', () => {
  test('aggregates a summary from its scheduled children and excludes unscheduled tasks', () => {
    const { timelineItems, unscheduledItems } = selectTimelineData([
      { id: 'summary', itemType: 'summary', task: 'Group' },
      { id: 'scheduled', itemType: 'task', parentId: 'summary', startDate: '2026-08-10', endDate: '2026-08-12', expectedDurationDays: 3 },
      { id: 'unscheduled', itemType: 'task', parentId: 'summary', expectedDurationDays: 2 },
    ]);

    expect(timelineItems).toEqual([
      expect.objectContaining({
        id: 'summary',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        expectedDurationDays: 3,
      }),
      expect.objectContaining({ id: 'scheduled' }),
    ]);
    expect(unscheduledItems).toEqual([expect.objectContaining({ id: 'unscheduled' })]);
  });
});
