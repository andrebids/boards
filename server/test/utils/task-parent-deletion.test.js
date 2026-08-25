const { expect } = require('chai');
const lodash = require('lodash');

const deleteTask = require('../../api/helpers/tasks/delete-one');
const insertToPositionables = require('../../api/helpers/utils/insert-to-positionables');

describe('Task parent deletion', () => {
  const parent = {
    id: 'parent-1',
    name: 'Parent',
    position: 200,
    parentTaskId: 'grandparent-1',
  };
  const children = [
    { id: 'child-1', name: 'First child', position: 100, parentTaskId: parent.id },
    { id: 'child-2', name: 'Second child', position: 200, parentTaskId: parent.id },
  ];
  const rootTasks = [
    { id: 'root-before', position: 100, parentTaskId: null },
    { id: 'root-after', position: 300, parentTaskId: null },
  ];

  beforeEach(() => {
    global._ = lodash;
  });

  afterEach(() => {
    delete global._;
    delete global.Action;
    delete global.GanttItem;
    delete global.Task;
    delete global.sails;
  });

  it('promotes children in order at the deleted parent position', async () => {
    const updates = [];

    global.GanttItem = {
      qm: {
        getOneBySourceTaskId: async () => null,
      },
    };
    global.Task = {
      qm: {
        getByTaskListId: async (taskListId, { parentTaskId }) =>
          (parentTaskId === parent.id ? children : rootTasks).map((task) => ({ ...task })),
        updateOne: async (id, values) => {
          const record = [...children, ...rootTasks].find((task) => task.id === id);
          const updatedTask = { ...record, ...values };
          updates.push(updatedTask);
          return updatedTask;
        },
      },
    };
    global.sails = {
      models: {
        task: {
          qm: {
            deleteOne: async () => parent,
          },
        },
      },
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        tasks: {
          syncParentCompletion: {
            with: async () => {},
          },
        },
        utils: {
          insertToPositionables: (position, records) =>
            insertToPositionables.fn({ position, records }),
          sendWebhooks: {
            with: () => {},
          },
        },
        actions: {
          createOne: {
            with: async () => {},
          },
        },
      },
    };

    await deleteTask.fn({
      record: parent,
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      taskList: { id: 'task-list-1' },
      actorUser: { id: 'user-1' },
    });

    const promotedChildren = children.map((child) =>
      updates.find((updatedTask) => updatedTask.id === child.id),
    );

    expect(promotedChildren.map((child) => child.parentTaskId)).to.deep.equal([
      parent.parentTaskId,
      parent.parentTaskId,
    ]);
    expect(promotedChildren[0].position).to.be.at.least(parent.position);
    expect(promotedChildren[0].position).to.be.below(promotedChildren[1].position);
    expect(promotedChildren[1].position).to.be.below(
      rootTasks.find((task) => task.id === 'root-after').position,
    );
  });
});
