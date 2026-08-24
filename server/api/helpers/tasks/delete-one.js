/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const _ = require('lodash');
const Action = require('../../models/Action');
const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const linkedItem = await GanttItem.qm.getOneBySourceTaskId(inputs.record.id);
    const childTasks = await Task.qm.getByTaskListId(inputs.taskList.id, {
      parentTaskId: inputs.record.id,
    });
    const rootTasks = childTasks.length
      ? await Task.qm.getByTaskListId(inputs.taskList.id, {
          exceptIdOrIds: inputs.record.id,
          parentTaskId: null,
        })
      : [];
    let insertionPosition = inputs.record.position;

    // Preserve child tasks when their parent is removed and keep connected clients in sync.
    // eslint-disable-next-line no-restricted-syntax
    for (const childTask of childTasks) {
      const { position, repositions } = sails.helpers.utils.insertToPositionables(
        insertionPosition,
        rootTasks,
      );

      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of repositions) {
        // eslint-disable-next-line no-await-in-loop
        const repositionedTask = await Task.qm.updateOne(reposition.record.id, {
          position: reposition.position,
        });
        const rootTaskIndex = rootTasks.findIndex(({ id }) => id === reposition.record.id);
        rootTasks[rootTaskIndex] = repositionedTask;
        sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', {
          item: repositionedTask,
        });
      }

      // eslint-disable-next-line no-await-in-loop
      const promotedTask = await Task.qm.updateOne(childTask.id, {
        parentTaskId: null,
        position,
      });
      sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', {
        item: promotedTask,
      });

      rootTasks.push(promotedTask);
      rootTasks.sort(
        (taskA, taskB) => taskA.position - taskB.position || taskA.id.localeCompare(taskB.id),
      );
      const promotedTaskIndex = rootTasks.findIndex(({ id }) => id === promotedTask.id);
      const nextTask = rootTasks[promotedTaskIndex + 1];
      insertionPosition = nextTask
        ? position + (nextTask.position - position) / 2
        : position + POSITION_GAP;
    }
    const task = await sails.models.task.qm.deleteOne(inputs.record.id);

    if (task) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'taskDelete',
        {
          item: task,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'taskDelete',
        buildData: () => ({
          item: task,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
            taskLists: [inputs.taskList],
          },
        }),
        user: inputs.actorUser,
      });

      // Criar ação para exclusão de tarefa
      await sails.helpers.actions.createOne.with({
        values: {
          type: Action.Types.DELETE_TASK,
          data: {
            card: _.pick(inputs.card, ['name']),
            task: _.pick(task, ['id', 'name']),
          },
          user: inputs.actorUser,
          card: inputs.card,
        },
        project: inputs.project,
        board: inputs.board,
        list: inputs.list,
      });

      if (linkedItem) {
        await sails.helpers.gantt.broadcastDetachedItems.with({
          items: [linkedItem],
          request: inputs.request,
        });
      }

      if (inputs.record.parentTaskId) {
        await sails.helpers.tasks.syncParentCompletion.with({
          parentTaskId: inputs.record.parentTaskId,
          board: inputs.board,
          request: inputs.request,
        });
      }
    }

    return task;
  },
};
