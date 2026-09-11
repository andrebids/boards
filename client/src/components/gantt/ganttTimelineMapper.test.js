import { mapGanttItemsToTimelineTasks } from './ganttTimelineMapper';

describe('mapGanttItemsToTimelineTasks', () => {
  test('uses the full date span for the bar while keeping the group duration label', () => {
    const [task] = mapGanttItemsToTimelineTasks(
      [
        {
          id: 'group',
          task: 'Group',
          itemType: 'summary',
          startDate: '2026-09-07',
          endDate: '2026-09-12',
          expectedDurationDays: 2,
        },
      ],
      (key, { count } = {}) => String(count),
    );
    expect(task.duration).toBe(6);
    expect(task.durationLabel).toBe('2');
  });
  test('keeps task parents as tasks and restores their expansion state', () => {
    const parent = {
      id: 'parent',
      itemType: 'task',
      task: 'Parent',
      startDate: '2026-09-07',
      endDate: '2026-09-09',
      expectedDurationDays: 3,
    };
    const child = { ...parent, id: 'child', parentId: 'parent' };
    const tasks = mapGanttItemsToTimelineTasks(
      [parent, child],
      (key) => key,
      new Map([['parent', false]]),
    );
    expect(tasks[0]).toMatchObject({ type: 'task', open: false });
    expect(tasks[1]).toMatchObject({ parent: 'parent' });
    expect(tasks[1].open).toBeUndefined();
  });
  test('converts the inclusive stored end date into the exclusive timeline end date', () => {
    const [task] = mapGanttItemsToTimelineTasks(
      [
        {
          id: 'item',
          task: 'Task',
          itemType: 'task',
          startDate: '2026-08-10',
          endDate: '2026-08-12',
          expectedDurationDays: 3,
        },
      ],
      (key) => key,
    );

    expect(task.end).toEqual(new Date(2026, 7, 13));
    expect(task.duration).toBe(3);
  });
});
