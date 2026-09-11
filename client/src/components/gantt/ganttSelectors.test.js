import { selectTimelineData } from './ganttSelectors';

describe('selectTimelineData', () => {
  const group = { id: 'group', itemType: 'summary' };
  const parent = {
    id: 'parent',
    itemType: 'task',
    parentId: 'group',
    startDate: '2026-09-07',
    endDate: '2026-09-09',
    expectedDurationDays: 3,
  };
  const child = {
    id: 'child',
    itemType: 'task',
    parentId: 'parent',
    startDate: '2026-09-08',
    endDate: '2026-09-11',
    expectedDurationDays: 4,
  };

  test('includes descendant dates without overwriting the parent or counting its duration twice', () => {
    const { timelineItems } = selectTimelineData([group, parent, child]);
    expect(timelineItems[0]).toMatchObject({
      startDate: '2026-09-07',
      endDate: '2026-09-11',
      expectedDurationDays: 3,
    });
    expect(timelineItems[1]).toEqual(parent);
    expect(timelineItems[2]).toEqual(child);
  });

  test('keeps undated ancestors visible without writing dates into the original items', () => {
    const undated = { ...parent, startDate: null, endDate: null };
    const { timelineItems, unscheduledItems } = selectTimelineData([group, undated, child]);
    expect(timelineItems[1]).toMatchObject({
      id: 'parent',
      startDate: child.startDate,
      endDate: child.endDate,
      hasDerivedDates: true,
    });
    expect(undated.startDate).toBeNull();
    expect(unscheduledItems).toEqual([undated]);
  });

  test('aggregates a summary from its scheduled children and excludes unscheduled tasks', () => {
    const { timelineItems, unscheduledItems } = selectTimelineData([
      { id: 'summary', itemType: 'summary', task: 'Group' },
      {
        id: 'scheduled',
        itemType: 'task',
        parentId: 'summary',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        expectedDurationDays: 3,
      },
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
