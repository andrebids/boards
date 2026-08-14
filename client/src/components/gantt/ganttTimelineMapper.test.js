import { mapGanttItemsToTimelineTasks } from './ganttTimelineMapper';

describe('mapGanttItemsToTimelineTasks', () => {
  test('converts the inclusive stored end date into the exclusive timeline end date', () => {
    const [task] = mapGanttItemsToTimelineTasks(
      [{ id: 'item', task: 'Task', itemType: 'task', startDate: '2026-08-10', endDate: '2026-08-12', expectedDurationDays: 3 }],
      (key) => key,
    );

    expect(task.end).toEqual(new Date(2026, 7, 13));
    expect(task.duration).toBe(3);
  });
});
