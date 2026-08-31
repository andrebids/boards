const _ = require('lodash');

const getDescendantTaskIds = (tasks, taskId) => {
  const descendantTaskIds = new Set();
  let parentTaskIds = new Set([taskId]);

  while (parentTaskIds.size > 0) {
    const nextParentTaskIds = new Set();

    tasks.forEach((task) => {
      if (parentTaskIds.has(task.parentTaskId) && !descendantTaskIds.has(task.id)) {
        descendantTaskIds.add(task.id);
        nextParentTaskIds.add(task.id);
      }
    });

    parentTaskIds = nextParentTaskIds;
  }

  return [...descendantTaskIds];
};

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    values: {
      type: 'json',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    taskList: {
      type: 'ref',
      required: true,
    },
    nextTaskList: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    invalidParentTask: {},
  },

  async fn(inputs) {
    const targetTaskListId = inputs.nextTaskList.id;
    const result = await sails.getDatastore().transaction(async (db) => {
      const tasks = await Task.qm.getByTaskListIds(
        _.uniq([inputs.taskList.id, targetTaskListId]),
        { connection: db },
      );
      const descendantTaskIds = getDescendantTaskIds(tasks, inputs.record.id);
      const excludedTaskIds = new Set([inputs.record.id, ...descendantTaskIds]);
      const parentTaskId = !_.isUndefined(inputs.values.parentTaskId)
        ? inputs.values.parentTaskId
        : inputs.record.parentTaskId;

      if (parentTaskId) {
        const parentTask = tasks.find((task) => task.id === parentTaskId);
        if (
          !parentTask ||
          parentTask.taskListId !== targetTaskListId ||
          excludedTaskIds.has(parentTask.id)
        ) {
          throw 'invalidParentTask';
        }
      }

      const siblings = tasks.filter(
        (task) =>
          task.taskListId === targetTaskListId &&
          (task.parentTaskId || null) === (parentTaskId || null) &&
          !excludedTaskIds.has(task.id),
      );
      const insertion = sails.helpers.utils.insertToPositionables(
        inputs.values.position,
        siblings,
      );
      const repositionedTasks = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of insertion.repositions) {
        // eslint-disable-next-line no-await-in-loop
        const repositionedTask = await Task.qm.updateOne(
          reposition.record.id,
          { position: reposition.position },
          { connection: db },
        );
        repositionedTasks.push(repositionedTask);
      }

      const task = await Task.qm.updateOne(
        inputs.record.id,
        {
          taskListId: targetTaskListId,
          parentTaskId: parentTaskId || null,
          position: insertion.position,
        },
        { connection: db },
      );

      let descendantTasks = [];
      if (targetTaskListId !== inputs.taskList.id && descendantTaskIds.length > 0) {
        descendantTasks = await Task.qm.update(
          { id: descendantTaskIds },
          { taskListId: targetTaskListId },
          { connection: db },
        );
      }

      return {
        task,
        updatedTasks: [task, ...descendantTasks],
        repositionedTasks,
      };
    });

    [...result.updatedTasks, ...result.repositionedTasks].forEach((task) => {
      sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', { item: task });
    });

    sails.helpers.utils.sendWebhooks.with({
      event: 'taskUpdate',
      buildData: () => ({
        item: result.task,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [inputs.card],
          taskLists: [inputs.nextTaskList],
          tasks: result.updatedTasks.slice(1),
        },
      }),
      buildPrevData: () => ({
        item: inputs.record,
        included: {
          taskLists: [inputs.taskList],
        },
      }),
      user: inputs.actorUser,
    });

    const parentTaskIds = _.uniq(
      [inputs.record.parentTaskId, result.task.parentTaskId].filter(Boolean),
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const parentTaskId of parentTaskIds) {
      // eslint-disable-next-line no-await-in-loop
      await sails.helpers.tasks.syncParentCompletion.with({
        parentTaskId,
        board: inputs.board,
        request: inputs.request,
      });
    }

    return result;
  },
};

