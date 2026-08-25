const { expect } = require('chai');
const lodash = require('lodash');

const createTask = require('../../api/controllers/tasks/create');

describe('Nested task creation', () => {
  afterEach(() => {
    delete global._;
    delete global.BoardMembership;
    delete global.Task;
    delete global.sails;
  });

  it('allows creating a task under another subtask', async () => {
    const taskList = { id: 'task-list-1' };
    const pathPromise = Promise.resolve({
      taskList,
      card: { id: 'card-1' },
      list: { id: 'list-1' },
      board: { id: 'board-1' },
      project: { id: 'project-1' },
    });
    pathPromise.intercept = () => pathPromise;

    let createdValues;
    global._ = lodash;
    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: {
        getOneByBoardIdAndUserId: async () => ({ role: 'editor' }),
      },
    };
    global.Task = {
      qm: {
        getOneById: async () => ({
          id: 'parent-subtask',
          taskListId: taskList.id,
          parentTaskId: 'root-task',
        }),
      },
    };
    global.sails = {
      helpers: {
        taskLists: {
          getPathToProjectById: () => pathPromise,
        },
        tasks: {
          createOne: {
            with: async ({ values }) => {
              createdValues = values;
              return { id: 'nested-task', ...values };
            },
          },
        },
      },
    };

    const result = await createTask.fn.call(
      {
        req: { currentUser: { id: 'user-1' } },
      },
      {
        taskListId: taskList.id,
        position: 100,
        name: 'Third level',
        parentTaskId: 'parent-subtask',
      },
    );

    expect(createdValues.parentTaskId).to.equal('parent-subtask');
    expect(result.item.parentTaskId).to.equal('parent-subtask');
  });
});
