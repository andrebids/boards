const { expect } = require('chai');

const syncParentCompletion = require('../../api/helpers/tasks/sync-parent-completion');

describe('Task parent completion', () => {
  const parent = { id: 'parent-1', taskListId: 'task-list-1', isCompleted: false };

  beforeEach(() => {
    global.sails = {
      sockets: { broadcast: () => {} },
    };
  });

  it('completes the parent only after every child is completed', async () => {
    const updates = [];
    global.Task = {
      qm: {
        getOneById: async () => parent,
        getByTaskListId: async () => [
          { id: 'child-1', isCompleted: true },
          { id: 'child-2', isCompleted: true },
        ],
        updateOne: async (id, values) => {
          updates.push({ id, values });
          return { ...parent, ...values };
        },
      },
    };

    await syncParentCompletion.fn({
      parentTaskId: parent.id,
      board: { id: 'board-1' },
    });

    expect(updates).to.deep.equal([{ id: parent.id, values: { isCompleted: true } }]);
  });

  it('reopens the parent when one child is reopened', async () => {
    const updates = [];
    const broadcasts = [];
    global.Task = {
      qm: {
        getOneById: async () => ({ ...parent, isCompleted: true }),
        getByTaskListId: async () => [
          { id: 'child-1', isCompleted: true },
          { id: 'child-2', isCompleted: false },
        ],
        updateOne: async (id, values) => {
          updates.push({ id, values });
          return { ...parent, ...values };
        },
      },
    };
    global.sails.sockets.broadcast = (...args) => broadcasts.push(args);

    await syncParentCompletion.fn({
      parentTaskId: parent.id,
      board: { id: 'board-1' },
      request: { socket: 'requesting-client' },
    });

    expect(updates).to.deep.equal([{ id: parent.id, values: { isCompleted: false } }]);
    expect(broadcasts).to.deep.equal([
      ['board:board-1', 'taskUpdate', { item: { ...parent, isCompleted: false } }],
    ]);
  });

  it('propagates completion through every ancestor', async () => {
    const tasksById = {
      root: { id: 'root', taskListId: 'task-list-1', parentTaskId: null, isCompleted: false },
      parent: {
        id: 'parent',
        taskListId: 'task-list-1',
        parentTaskId: 'root',
        isCompleted: false,
      },
      leaf: {
        id: 'leaf',
        taskListId: 'task-list-1',
        parentTaskId: 'parent',
        isCompleted: true,
      },
    };
    const updates = [];

    global.Task = {
      qm: {
        getOneById: async (id) => tasksById[id],
        getByTaskListId: async (taskListId, { parentTaskId }) =>
          Object.values(tasksById).filter((task) => task.parentTaskId === parentTaskId),
        updateOne: async (id, values) => {
          tasksById[id] = { ...tasksById[id], ...values };
          updates.push({ id, values });
          return tasksById[id];
        },
      },
    };

    await syncParentCompletion.fn({
      parentTaskId: 'parent',
      board: { id: 'board-1' },
    });

    expect(updates).to.deep.equal([
      { id: 'parent', values: { isCompleted: true } },
      { id: 'root', values: { isCompleted: true } },
    ]);
  });
});
