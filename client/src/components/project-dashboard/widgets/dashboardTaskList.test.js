import {
  createDashboardTaskListSnapshot,
  getDashboardTaskListLayout,
  reduceDashboardTaskListEvent,
} from './dashboardTaskList';

describe('dashboard task list state', () => {
  it('preserves sentence width and reduces type before squeezing more columns into a short panel', () => {
    const layout = getDashboardTaskListLayout(18, 340, 800);
    expect(layout.columns).toBe(2);
    expect(layout.fontSize).toBe(13);
    expect(layout.rows * layout.rowHeight + (layout.rows - 1) * 2).toBeLessThanOrEqual(340);
    expect(getDashboardTaskListLayout(18, 340, 370).columns).toBe(1);
  });

  it('scales rows and type up when a short list has a tall TV panel', () => {
    const layout = getDashboardTaskListLayout(5, 812, 1235);
    expect(layout).toEqual({ columns: 1, rows: 5, rowHeight: 72, fontSize: 26 });
    expect(getDashboardTaskListLayout(40, 812, 1235)).toMatchObject({ columns: 3, fontSize: 20 });
  });

  it('distributes every task across columns that fit the available height', () => {
    expect(getDashboardTaskListLayout(18, 340)).toEqual({ columns: 2, rows: 9 });
    expect(getDashboardTaskListLayout(4, 340)).toEqual({ columns: 1, rows: 4 });
    expect(getDashboardTaskListLayout(0, 340)).toEqual({ columns: 1, rows: 1 });
  });

  it('selects the configured list and sorts only its tasks', () => {
    expect(
      createDashboardTaskListSnapshot(
        {
          included: {
            taskLists: [
              { id: 'other-list', name: 'Other' },
              { id: 'target-list', name: 'Decors list' },
            ],
            tasks: [
              { id: 'second', taskListId: 'target-list', position: 20 },
              { id: 'other', taskListId: 'other-list', position: 5 },
              { id: 'first', taskListId: 'target-list', position: 10 },
            ],
          },
        },
        'target-list',
      ),
    ).toEqual({
      taskList: { id: 'target-list', name: 'Decors list' },
      tasks: [
        { id: 'first', taskListId: 'target-list', position: 10 },
        { id: 'second', taskListId: 'target-list', position: 20 },
      ],
    });
  });

  it('reconciles task changes and movements across the configured list', () => {
    let state = {
      taskList: { id: 'target-list', name: 'Decors list' },
      tasks: [{ id: 'existing', taskListId: 'target-list', position: 10, name: 'Old' }],
    };

    state = reduceDashboardTaskListEvent(state, 'taskUpdate', {
      id: 'existing',
      taskListId: 'target-list',
      position: 20,
      name: 'Updated',
    });
    state = reduceDashboardTaskListEvent(state, 'taskCreate', {
      id: 'incoming',
      taskListId: 'target-list',
      position: 10,
      name: 'Incoming',
    });

    expect(state.tasks.map(({ id }) => id)).toEqual(['incoming', 'existing']);
    expect(state.tasks[1].name).toBe('Updated');

    state = reduceDashboardTaskListEvent(state, 'taskUpdate', {
      id: 'existing',
      taskListId: 'other-list',
      position: 5,
      name: 'Moved out',
    });
    state = reduceDashboardTaskListEvent(state, 'taskDelete', {
      id: 'incoming',
      taskListId: 'target-list',
    });

    expect(state.tasks).toEqual([]);
  });

  it('renames and removes the configured task list from socket events', () => {
    const state = {
      taskList: { id: 'target-list', name: 'Decors list' },
      tasks: [{ id: 'task', taskListId: 'target-list', position: 10 }],
    };

    expect(
      reduceDashboardTaskListEvent(state, 'taskListUpdate', {
        id: 'target-list',
        name: 'Decors 2027',
      }).taskList.name,
    ).toBe('Decors 2027');

    expect(reduceDashboardTaskListEvent(state, 'taskListDelete', { id: 'target-list' })).toEqual({
      taskList: null,
      tasks: [],
    });
  });
});
