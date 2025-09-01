/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Action = require('../../models/Action');
const TaskList = require('../../models/TaskList');
const _ = require('lodash');

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

    const taskLists = await sails.models.tasklist.qm.getByCardId(values.card.id);

    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      taskLists,
    );

    if (repositions.length > 0) {
      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of repositions) {
        // eslint-disable-next-line no-await-in-loop
        await sails.models.tasklist.qm.updateOne(
          {
            id: reposition.record.id,
            cardId: reposition.record.cardId,
          },
          {
            position: reposition.position,
          },
        );

        sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskListUpdate', {
          item: {
            id: reposition.record.id,
            position: reposition.position,
          },
        });

        // TODO: send webhooks
      }
    }

    const taskList = await sails.models.tasklist.qm.createOne({
      ...values,
      position,
      cardId: values.card.id,
    });

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'taskListCreate',
      {
        item: taskList,
      },
      inputs.request,
    );

    sails.helpers.utils.sendWebhooks.with({
      event: 'taskListCreate',
      buildData: () => ({
        item: taskList,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: inputs.actorUser,
    });

    // Criar ação para criação de lista de tarefas
    await sails.helpers.actions.createOne.with({
      values: {
        type: Action.Types.CREATE_TASK_LIST,
        data: {
          card: _.pick(values.card, ['name']),
          taskList: _.pick(taskList, ['id', 'name']),
        },
        user: inputs.actorUser,
        card: values.card,
      },
      project: inputs.project,
      board: inputs.board,
      list: inputs.list,
    });

    return taskList;
  },
};
