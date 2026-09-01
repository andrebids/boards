const { expect } = require('chai');

const { getTaskAssigneeUserIds, attachTaskAssigneeUserIds } = require('../../utils/task-assignees');

describe('Task assignees', () => {
  it('prefers the normalized multi-assignee list and removes duplicates', () => {
    expect(
      getTaskAssigneeUserIds({
        assigneeUserId: 'user-legacy',
        assigneeUserIds: ['user-1', 'user-2', 'user-1'],
      }),
    ).to.deep.equal(['user-1', 'user-2']);
  });

  it('falls back to the legacy assignee while old records are migrated', () => {
    expect(getTaskAssigneeUserIds({ assigneeUserId: 'user-legacy' })).to.deep.equal([
      'user-legacy',
    ]);
  });

  it('attaches grouped assignees to every task', () => {
    const tasks = [{ id: 'task-1' }, { id: 'task-2', assigneeUserId: 'user-legacy' }];

    const result = attachTaskAssigneeUserIds(tasks, [
      { taskId: 'task-1', userId: 'user-1' },
      { taskId: 'task-1', userId: 'user-2' },
    ]);

    expect(result).to.deep.equal([
      { id: 'task-1', assigneeUserIds: ['user-1', 'user-2'] },
      { id: 'task-2', assigneeUserId: 'user-legacy', assigneeUserIds: ['user-legacy'] },
    ]);
  });
});
