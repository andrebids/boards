/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Action = require('../../models/Action');
const Task = require('../../models/Task');
const _ = require('lodash');

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
    }

    return task;
  },
};
