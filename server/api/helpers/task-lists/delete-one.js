/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Action = require('../../models/Action');
const TaskList = require('../../models/TaskList');
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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    await sails.helpers.taskLists.deleteRelated(inputs.record);

    const taskList = await sails.models.tasklist.qm.deleteOne(inputs.record.id);

    if (taskList) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'taskListDelete',
        {
          item: taskList,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'taskListDelete',
        buildData: () => ({
          item: taskList,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
          },
        }),
        user: inputs.actorUser,
      });

      // Criar ação para exclusão de lista de tarefas
      await sails.helpers.actions.createOne.with({
        values: {
          type: Action.Types.DELETE_TASK_LIST,
          data: {
            card: _.pick(inputs.card, ['name']),
            taskList: _.pick(taskList, ['id', 'name']),
          },
          user: inputs.actorUser,
          card: inputs.card,
        },
        project: inputs.project,
        board: inputs.board,
        list: inputs.list,
      });
    }

    return taskList;
  },
};
