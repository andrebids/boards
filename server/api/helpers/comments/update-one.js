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
    const previousText = inputs.record.text;

    const comment = await Comment.qm.updateOne(inputs.record.id, values);

    if (comment && values.text !== undefined) {
      const mentionUserIds = await sails.helpers.comments.getNewMentionUserIds.with({
        text: comment.text,
        previousText,
        boardId: inputs.board.id,
        exceptUserIdOrIds: inputs.actorUser.id,
      });

      await Promise.all(
        mentionUserIds.map((userId) =>
          sails.helpers.notifications.createOne.with({
            values: {
              userId,
              comment,
              type: Notification.Types.MENTION_IN_COMMENT,
              data: {
                card: _.pick(inputs.card, ['name']),
                text: comment.text,
              },
              creatorUser: inputs.actorUser,
              card: inputs.card,
            },
            project: inputs.project,
            board: inputs.board,
            list: inputs.list,
          }),
        ),
      );
    }

    // Criar atividade para atualização do comentário usando o helper padronizado
    if (comment) {
      try {
        // Usar o helper de atividades de comentário (mesmo padrão da criação)
        await sails.helpers.activities.createCommentActivity.with({
          comment,
          card: inputs.card,
          user: inputs.actorUser,
          board: inputs.board,
          action: 'update',
        });
      } catch (activityError) {
        sails.log.warn('Failed to create activity for an updated comment', activityError);
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
