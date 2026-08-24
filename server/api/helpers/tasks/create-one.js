/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const _ = require('lodash');
const Action = require('../../models/Action');

module.exports = {
  inputs: {
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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const tasks = await sails.models.task.qm.getByTaskListId(values.taskList.id, {
      parentTaskId: values.parentTaskId || null,
    });

    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      tasks,
    );

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

    const task = await sails.models.task.qm.createOne({
      ...values,
      position,
      taskListId: values.taskList.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'taskCreate',
      {
        item: task,
      },
      inputs.request,
    );

    if (task.parentTaskId) {
      await sails.helpers.tasks.syncParentCompletion.with({
        parentTaskId: task.parentTaskId,
        board: inputs.board,
        request: inputs.request,
      });
    }

    sails.helpers.utils.sendWebhooks.with({
      event: 'taskCreate',
      buildData: () => ({
        item: task,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [inputs.card],
          taskLists: [values.taskList],
        },
      }),
      user: inputs.actorUser,
    });

    // Criar ação para criação de tarefa
    await sails.helpers.actions.createOne.with({
      values: {
        type: Action.Types.CREATE_TASK,
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

    return task;
  },
};
