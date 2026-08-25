const { expect } = require('chai');

const { isTaskInParentChain } = require('../../utils/task-hierarchy');

describe('Task hierarchy', () => {
  it('detects when a proposed parent is already a descendant of the task', async () => {
    const tasksById = {
      child: { id: 'child', parentTaskId: 'task' },
      task: { id: 'task', parentTaskId: null },
    };

    const result = await isTaskInParentChain({
      taskId: 'task',
      parentTask: tasksById.child,
      getTaskById: async (id) => tasksById[id],
    });

    expect(result).to.equal(true);
  });
});
