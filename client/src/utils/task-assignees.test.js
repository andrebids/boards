import { getTaskAssigneeUserIds, toggleTaskAssignee } from './task-assignees';

describe('task assignees', () => {
  it('keeps compatibility with tasks that only have the legacy assignee', () => {
    expect(getTaskAssigneeUserIds({ assigneeUserId: 'user-1' })).toEqual(['user-1']);
  });

  it('adds and removes users without replacing the other assignees', () => {
    expect(toggleTaskAssignee(['user-1'], 'user-2', true)).toEqual(['user-1', 'user-2']);
    expect(toggleTaskAssignee(['user-1', 'user-2'], 'user-1', false)).toEqual(['user-2']);
  });
});
