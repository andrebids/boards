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
    // Criar atividade para remoção do comentário (antes de remover) usando o helper padronizado
    try {
      // Usar o helper de atividades de comentário (mesmo padrão da criação)
      const activity = await sails.helpers.activities.createCommentActivity.with({
        comment: inputs.record, // Usar o comentário antes de ser deletado
        card: inputs.card,
        user: inputs.actorUser,
        board: inputs.board,
        action: 'delete'
      });

      console.log('✅ Atividade de remoção de comentário criada:', activity.id);
    } catch (activityError) {
      console.error('❌ Erro ao criar atividade de remoção de comentário:', activityError);
      // Não falhar a remoção do comentário se a atividade falhar
    }

    const comment = await Comment.qm.deleteOne(inputs.record.id);

    if (comment) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'commentDelete',
        {
          item: comment,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'commentDelete',
        buildData: () => ({
          item: comment,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
          },
        }),
        user: inputs.actorUser,
      });
    }

    return comment;
  },
};
