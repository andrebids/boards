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

  test('derives parent dates from subtasks without changing its stored schedule', () => {
    const { timelineItems } = selectTimelineData([group, parent, child]);
    expect(timelineItems[0]).toMatchObject({
      startDate: '2026-09-08',
      endDate: '2026-09-11',
      expectedDurationDays: 4,
    });
    expect(timelineItems[1]).toMatchObject({
      startDate: child.startDate,
      endDate: child.endDate,
      expectedDurationDays: 4,
      hasDerivedDates: true,
    });
    expect(parent.startDate).toBe('2026-09-07');
    expect(parent.endDate).toBe('2026-09-09');
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
    expect(unscheduledItems).toEqual([]);
  });

  test('uses the first and last scheduled subtasks, ignoring old parent dates and unscheduled children', () => {
    const oldParent = { ...parent, startDate: '2026-08-23', endDate: '2026-09-19' };
    const first = { ...child, id: 'first', startDate: '2026-08-10', endDate: '2026-08-29' };
    const last = { ...child, id: 'last', startDate: '2026-08-16', endDate: '2026-09-05' };
    const unscheduled = { ...child, id: 'unscheduled', startDate: null, endDate: null };
    const { timelineItems, unscheduledItems } = selectTimelineData([
      group,
      oldParent,
      first,
      last,
      unscheduled,
    ]);
    expect(timelineItems[1]).toMatchObject({
      startDate: '2026-08-10',
      endDate: '2026-09-05',
      expectedDurationDays: 20,
      hasDerivedDates: true,
    });
    expect(timelineItems[0]).toMatchObject({
      startDate: '2026-08-10',
      endDate: '2026-09-05',
      expectedDurationDays: 20,
    });
    expect(unscheduledItems).toEqual([unscheduled]);
  });

  test('falls back to its own dates when no subtasks are scheduled', () => {
    const unscheduled = { ...child, startDate: null, endDate: null };
    expect(selectTimelineData([group, parent, unscheduled]).timelineItems[1]).toEqual(parent);
    expect(selectTimelineData([group, parent]).timelineItems[1]).toEqual(parent);
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
