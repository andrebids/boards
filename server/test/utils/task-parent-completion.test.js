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

    await syncParentCompletion.fn({
      parentTaskId: parent.id,
      board: { id: 'board-1' },
    });

    expect(updates).to.deep.equal([{ id: parent.id, values: { isCompleted: false } }]);
  });
});
