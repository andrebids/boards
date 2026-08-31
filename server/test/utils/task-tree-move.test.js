const { expect } = require('chai');
const lodash = require('lodash');

const moveTaskTree = require('../../api/helpers/tasks/move-tree');

describe('Task tree move', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {};
    ['_', 'sails', 'Task'].forEach((name) => {
      previousGlobals[name] = global[name];
    });

    global._ = lodash;
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  const createState = ({ failDescendantUpdate = false } = {}) => {
    let committedTasks = [
      {
        id: 'root-1',
        taskListId: 'list-1',
        parentTaskId: null,
        position: 100,
        name: 'Root',
      },
      {
        id: 'child-1',
        taskListId: 'list-1',
        parentTaskId: 'root-1',
        position: 100,
        name: 'Child',
      },
      {
        id: 'grandchild-1',
        taskListId: 'list-1',
        parentTaskId: 'child-1',
        position: 100,
        name: 'Grandchild',
      },
      {
        id: 'target-root',
        taskListId: 'list-2',
        parentTaskId: null,
        position: 100,
        name: 'Target',
      },
    ];
    const broadcasts = [];
    const connections = [];

    global.Task = {
      qm: {
        getByTaskListIds: async (taskListIds, { connection }) => {
          connections.push(connection);
          return connection.tasks.filter((task) => taskListIds.includes(task.taskListId));
        },
        updateOne: async (criteria, values, { connection }) => {
          connections.push(connection);
          const id = typeof criteria === 'string' ? criteria : criteria.id;
          const task = connection.tasks.find((currentTask) => currentTask.id === id);
          Object.assign(task, values);
          return { ...task };
        },
        update: async (criteria, values, { connection }) => {
          connections.push(connection);
          if (failDescendantUpdate) {
            throw new Error('simulated descendant update failure');
          }

          const ids = criteria.id;
          return connection.tasks
            .filter((task) => ids.includes(task.id))
            .map((task) => {
              Object.assign(task, values);
              return { ...task };
            });
        },
      },
    };

    global.sails = {
      getDatastore: () => ({
        transaction: async (callback) => {
          const connection = { tasks: lodash.cloneDeep(committedTasks) };
          const result = await callback(connection);
          committedTasks = connection.tasks;
          return result;
        },
      }),
      helpers: {
        utils: {
          insertToPositionables: (position) => ({ position, repositions: [] }),
          sendWebhooks: { with: () => {} },
        },
        tasks: {
          syncParentCompletion: { with: async () => {} },
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };

    return {
      broadcasts,
      connections,
      getTasks: () => committedTasks,
    };
  };

  it('moves the complete subtree to another task list in one transaction', async () => {
    const state = createState();

    const result = await moveTaskTree.fn({
      record: state.getTasks()[0],
      values: {
        taskListId: 'list-2',
        parentTaskId: 'target-root',
        position: 200,
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'board-list-1' },
      card: { id: 'card-1' },
      taskList: { id: 'list-1' },
      nextTaskList: { id: 'list-2' },
      actorUser: { id: 'user-1' },
      request: { id: 'request-1' },
    });

    expect(result.task).to.include({
      id: 'root-1',
      taskListId: 'list-2',
      parentTaskId: 'target-root',
      position: 200,
    });
    expect(result.updatedTasks.map((task) => task.id)).to.have.members([
      'root-1',
      'child-1',
      'grandchild-1',
    ]);
    expect(
      state.getTasks().filter((task) => ['root-1', 'child-1', 'grandchild-1'].includes(task.id)),
    ).to.satisfy((tasks) => tasks.every((task) => task.taskListId === 'list-2'));
    expect(state.connections).to.have.length.greaterThan(0);
    expect(state.connections.every(Boolean)).to.equal(true);
    expect(state.broadcasts).to.have.length(3);
  });

  it('rolls back the root move and emits no sockets when descendant movement fails', async () => {
    const state = createState({ failDescendantUpdate: true });
    const originalTasks = lodash.cloneDeep(state.getTasks());

    let error;
    try {
      await moveTaskTree.fn({
        record: state.getTasks()[0],
        values: {
          taskListId: 'list-2',
          parentTaskId: null,
          position: 200,
        },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        list: { id: 'board-list-1' },
        card: { id: 'card-1' },
        taskList: { id: 'list-1' },
        nextTaskList: { id: 'list-2' },
        actorUser: { id: 'user-1' },
        request: { id: 'request-1' },
      });
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.have.property('message', 'simulated descendant update failure');
    expect(state.getTasks()).to.deep.equal(originalTasks);
    expect(state.broadcasts).to.deep.equal([]);
  });

  it('rejects moving a task below one of its own descendants', async () => {
    const state = createState();
    const originalTasks = lodash.cloneDeep(state.getTasks());

    let error;
    try {
      await moveTaskTree.fn({
        record: state.getTasks()[0],
        values: {
          taskListId: 'list-1',
          parentTaskId: 'grandchild-1',
          position: 200,
        },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        list: { id: 'board-list-1' },
        card: { id: 'card-1' },
        taskList: { id: 'list-1' },
        nextTaskList: { id: 'list-1' },
        actorUser: { id: 'user-1' },
        request: { id: 'request-1' },
      });
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.equal('invalidParentTask');
    expect(state.getTasks()).to.deep.equal(originalTasks);
    expect(state.broadcasts).to.deep.equal([]);
  });
});
