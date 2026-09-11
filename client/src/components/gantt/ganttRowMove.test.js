import getGanttRowMoveChanges, {
  getGanttRowDropIntent,
  getGanttListDropChanges,
} from './ganttRowMove';
import { updateGanttSchedule } from '../../utils/gantt-dates';
import { selectTimelineData } from './ganttSelectors';

const items = [
  { id: 'group', itemType: 'summary', parentId: null, position: 65536 },
  { id: 'a', itemType: 'task', parentId: 'group', position: 65536 },
  { id: 'child', itemType: 'task', parentId: 'a', position: 65536 },
  { id: 'hidden', itemType: 'task', parentId: 'group', position: 98304 },
  { id: 'b', itemType: 'task', parentId: 'group', position: 131072 },
  { id: 'root', itemType: 'task', parentId: null, position: 131072 },
].map((item) => ({ ...item, ganttPlanId: 'plan', version: 3 }));

test('an unscheduled list drop sets hierarchy and order while using the target start and own duration', () => {
  const task = {
    id: 'new',
    task: 'New',
    itemType: 'task',
    parentId: null,
    ganttPlanId: 'plan',
    position: 196608,
    version: 1,
    expectedDurationDays: 3,
  };
  const all = [...items, task];
  const changes = getGanttListDropChanges(all, task.id, 'a', 'child');
  expect(changes).toMatchObject({ parentId: 'a', position: 131072, version: 1 });
  const scheduled = { ...updateGanttSchedule(task, { startDate: '2026-09-11' }), ...changes };
  expect(scheduled).toMatchObject({
    startDate: '2026-09-11',
    endDate: '2026-09-15',
    expectedDurationDays: 3,
  });
  expect(selectTimelineData([...items, scheduled]).unscheduledItems).not.toContainEqual(scheduled);
  expect(getGanttListDropChanges(all, task.id, 'b', 'before')).toMatchObject({
    parentId: 'group',
    position: 114688,
  });
  expect(getGanttListDropChanges(all, task.id, 'b', 'after')).toMatchObject({
    parentId: 'group',
    position: 196608,
  });
  expect(getGanttListDropChanges(all, task.id, 'child', 'child')).toBeNull();
  expect(getGanttListDropChanges(all, task.id, task.id, 'child')).toBeNull();
});
test('orders siblings without changing the schedule and includes hidden siblings', () => {
  expect(getGanttRowMoveChanges(items, 'b', 'group', 'a')).toEqual({
    parentId: 'group',
    position: 32768,
    version: 3,
  });
  expect(getGanttRowMoveChanges(items, 'a', 'group', 'b')).toEqual({
    parentId: 'group',
    position: 114688,
    version: 3,
  });
  expect(getGanttRowMoveChanges(items, 'b', 'group')).toBeNull();
});

test('feedback and drop use the native sibling/parent destination and the same threshold', () => {
  const task = { id: 'b', parent: 'group', $level: 2 };
  const parent = { id: 'group', parent: 0, data: [{ id: 'a' }, task] };
  expect(getGanttRowDropIntent(items, task, parent, 19)).toEqual({
    mode: undefined,
    parentId: 'group',
    level: 2,
    valid: true,
  });
  expect(getGanttRowDropIntent(items, task, parent, 20)).toEqual({
    mode: true,
    parentId: 'a',
    level: 3,
    valid: true,
  });
  expect(getGanttRowDropIntent(items, task, parent, -20)).toEqual({
    mode: false,
    parentId: null,
    level: 1,
    valid: true,
  });
  expect(getGanttRowDropIntent(items, task, { ...parent, data: [task] }, 20).valid).toBe(false);
  const branch = { id: 'a', parent: 'group', $level: 2 };
  expect(getGanttRowDropIntent(items, branch, { ...parent, data: [task, branch] }, 20).valid).toBe(
    false,
  );
});

test('reparents and promotes while rejecting cycles and hidden descendants beyond the depth limit', () => {
  expect(getGanttRowMoveChanges(items, 'b', 'a')).toMatchObject({
    parentId: 'a',
  });
  expect(getGanttRowMoveChanges(items, 'child', null, 'root')).toMatchObject({
    parentId: null,
  });
  expect(getGanttRowMoveChanges(items, 'a', 'b')).toBeNull();
  expect(getGanttRowMoveChanges(items, 'a', 'child')).toBeNull();
  expect(getGanttRowMoveChanges(items, 'group', 'root')).toBeNull();
  expect(
    getGanttRowMoveChanges(
      [
        ...items,
        {
          id: 'undated-child',
          itemType: 'task',
          parentId: 'b',
          ganttPlanId: 'plan',
        },
      ],
      'b',
      'a',
    ),
  ).toBeNull();
});

test('orders the timeline after an update and after a reload without mutating source items', () => {
  const scheduled = ['second', 'first'].map((id, index) => ({
    id,
    itemType: 'task',
    position: index ? 32768 : 65536,
    startDate: '2026-09-10',
    endDate: '2026-09-11',
    expectedDurationDays: 2,
  }));
  expect(selectTimelineData(scheduled).timelineItems.map(({ id }) => id)).toEqual([
    'first',
    'second',
  ]);
  expect(scheduled.map(({ id }) => id)).toEqual(['second', 'first']);
});
