/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

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

    const comment = await Comment.qm.updateOne(inputs.record.id, values);

    // Criar atividade para atualização do comentário usando o helper padronizado
    if (comment) {
      try {
        // Usar o helper de atividades de comentário (mesmo padrão da criação)
        const activity = await sails.helpers.activities.createCommentActivity.with({
          comment: comment,
          card: inputs.card,
          user: inputs.actorUser,
          board: inputs.board,
          action: 'update'
        });

        console.log('✅ Atividade de atualização de comentário criada:', activity.id);
      } catch (activityError) {
        console.error('❌ Erro ao criar atividade de atualização de comentário:', activityError);
        // Não falhar a atualização do comentário se a atividade falhar
      }
    }

    if (comment) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'commentUpdate',
        {
          item: comment,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'commentUpdate',
        buildData: () => ({
          item: comment,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
          },
        }),
        buildPrevData: () => ({
          item: inputs.record,
        }),
        user: inputs.actorUser,
      });
    }

    return comment;
  },
};
