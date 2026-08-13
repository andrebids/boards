const { expect } = require('chai');

const syncLinkedItemFromTask = require('../../api/helpers/gantt/sync-linked-item-from-task');

describe('Gantt source task', () => {
  const globalNames = ['GanttItem', 'sails'];
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = Object.fromEntries(globalNames.map((name) => [name, global[name]]));
  });

  afterEach(() => {
    globalNames.forEach((name) => {
      if (previousGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = previousGlobals[name];
      }
    });
  });

  it('syncs source-owned fields without replacing Gantt planning', async () => {
    const updates = [];
    const broadcasts = [];
    const storedItem = {
      id: 'gantt-1',
      ganttPlanId: 'plan-1',
      sourceTaskId: 'task-1',
      task: 'Old name',
      startDate: '2026-08-20',
      endDate: '2026-08-22',
      expectedDurationDays: 3,
      version: 4,
    };
    global.GanttItem = {
      qm: {
        getOneBySourceTaskId: async () => storedItem,
        updateOne: async (id, values) => {
          updates.push({ id, values });
          return { ...storedItem, ...values };
        },
      },
    };
    global.sails = {
      helpers: {
        gantt: {
          syncItemAssignees: async (id, userIds) =>
            userIds.map((userId) => ({
              ganttItemId: id,
              userId,
            })),
          presentItem: (item, assignees, sourceTask) => ({ item, assignees, sourceTask }),
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };

    await syncLinkedItemFromTask.fn({
      task: {
        id: 'task-1',
        name: 'New name',
        isCompleted: true,
        assigneeUserId: 'user-1',
      },
      taskList: { id: 'task-list-1', name: 'Checklist' },
      card: { id: 'card-1', name: 'Card' },
      board: { id: 'board-1', name: 'Board' },
    });

    expect(updates).to.deep.equal([{ id: 'gantt-1', values: { task: 'New name', version: 5 } }]);
    expect(broadcasts).to.have.lengthOf(1);
    expect(broadcasts[0][0]).to.equal('ganttPlan:plan-1');
    expect(broadcasts[0][2].item.item).to.include({
      startDate: '2026-08-20',
      endDate: '2026-08-22',
      expectedDurationDays: 3,
    });
    expect(broadcasts[0][2].item.sourceTask).to.include({
      id: 'task-1',
      isCompleted: true,
      assigneeUserId: 'user-1',
    });
  });
});
