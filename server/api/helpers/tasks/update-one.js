/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const _ = require('lodash');
const Action = require('../../models/Action');
const { getTaskAssigneeUserIds } = require('../../../utils/task-assignees');

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
    assigneeUserIds: {
      type: 'ref',
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

  exits: {
    taskListInValuesMustBelongToCard: {},
  },

  // TODO: use normalizeValues
  async fn(inputs) {
    const { values } = inputs;

    if (values.taskList) {
      if (values.taskList.cardId !== inputs.card.id) {
        throw 'taskListInValuesMustBelongToCard';
      }

      if (values.taskList.id === inputs.taskList.id) {
        delete values.taskList;
      } else {
        values.taskListId = values.taskList.id;
      }
    }

    const taskList = values.taskList || inputs.taskList;

    const parentTaskId = !_.isUndefined(values.parentTaskId)
      ? values.parentTaskId
      : inputs.record.parentTaskId;

    if (!_.isUndefined(values.position)) {
      const tasks = await sails.models.task.qm.getByTaskListId(taskList.id, {
        exceptIdOrIds: inputs.record.id,
        parentTaskId: parentTaskId || null,
      });

      const { position, repositions } = sails.helpers.utils.insertToPositionables(
        values.position,
        tasks,
      );

      values.position = position;

      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of repositions) {
        // eslint-disable-next-line no-await-in-loop
        await sails.models.task.qm.updateOne(
          {
            id: reposition.record.id,
            taskListId: reposition.record.taskListId,
          },
          {
            position: reposition.position,
          },
        );

        sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', {
          item: {
            id: reposition.record.id,
            position: reposition.position,
          },
        });

        // TODO: send webhooks
      }
    }

    let task;
    if (inputs.assigneeUserIds) {
      task = await sails.getDatastore().transaction(async (db) => {
        const updatedTask = await sails.models.task.qm.updateOne(inputs.record.id, values, {
          connection: db,
        });

        await TaskAssignee.qm.delete(
          {
            taskId: inputs.record.id,
          },
          { connection: db },
        );
        await TaskAssignee.qm.create(
          inputs.assigneeUserIds.map((userId) => ({
            taskId: inputs.record.id,
            userId,
          })),
          { connection: db },
        );

        return updatedTask;
      });
      if (task) {
        task.assigneeUserIds = inputs.assigneeUserIds;
      }
    } else {
      task = await sails.models.task.qm.updateOne(inputs.record.id, values);
      if (task) {
        task.assigneeUserIds = getTaskAssigneeUserIds(inputs.record);
      }
    }

    if (task) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'taskUpdate',
        {
          item: task,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'taskUpdate',
        buildData: () => ({
          item: task,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
            taskLists: [taskList],
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

      if (inputs.record.isCompleted !== task.isCompleted) {
        await sails.helpers.actions.createOne.with({
          values: {
            type: task.isCompleted ? Action.Types.COMPLETE_TASK : Action.Types.UNCOMPLETE_TASK,
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
      } else if (inputs.record.name !== task.name) {
        // Criar ação para atualização de tarefa (quando o nome muda)
        await sails.helpers.actions.createOne.with({
          values: {
            type: Action.Types.UPDATE_TASK,
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
      }

      if (
        inputs.record.name !== task.name ||
        !_.isEqual(getTaskAssigneeUserIds(inputs.record), task.assigneeUserIds) ||
        inputs.record.isCompleted !== task.isCompleted
      ) {
        await sails.helpers.gantt.syncLinkedItemFromTask.with({
          task,
          taskList,
          card: inputs.card,
          board: inputs.board,
          request: inputs.request,
        });
      }

      const parentTaskIds = _.uniq([inputs.record.parentTaskId, task.parentTaskId].filter(Boolean));
      // eslint-disable-next-line no-restricted-syntax
      for (const parentTaskIdToSync of parentTaskIds) {
        // eslint-disable-next-line no-await-in-loop
        await sails.helpers.tasks.syncParentCompletion.with({
          parentTaskId: parentTaskIdToSync,
          board: inputs.board,
          request: inputs.request,
        });
      }
    }

    return task;
  },
};
