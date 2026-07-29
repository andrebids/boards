/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
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
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const comment = await Comment.qm.createOne({
      ...values,
      cardId: values.card.id,
      userId: values.user.id,
    });

    // Criar atividade para o comentário
    try {
      // Usar o helper de atividades de comentário
      await sails.helpers.activities.createCommentActivity.with({
        comment,
        card: values.card,
        user: values.user,
        board: inputs.board,
        action: 'create',
      });
    } catch (activityError) {
      sails.log.warn('Failed to create activity for a new comment', activityError);
      // Não falhar a criação do comentário se a atividade falhar
    }

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'commentCreate',
      {
        item: comment,
        included: {
          users: [sails.helpers.users.presentOne(values.user, {})],
        },
      },
      inputs.request,
    );

    sails.helpers.utils.sendWebhooks.with({
      event: 'commentCreate',
      buildData: () => ({
        item: comment,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: values.user,
    });

    const mentionUserIds = await sails.helpers.comments.getNewMentionUserIds.with({
      text: comment.text,
      boardId: inputs.board.id,
      exceptUserIdOrIds: comment.userId,
    });

    const mentionUserIdsSet = new Set(mentionUserIds);

    const cardSubscriptionUserIds = await sails.helpers.cards.getSubscriptionUserIds(
      comment.cardId,
      comment.userId,
    );

    const boardSubscriptionUserIds = await sails.helpers.boards.getSubscriptionUserIds(
      inputs.board.id,
      comment.userId,
    );

    const notifiableUserIds = _.union(
      mentionUserIds,
      cardSubscriptionUserIds,
      boardSubscriptionUserIds,
    );

    await Promise.all(
      notifiableUserIds.map((userId) =>
        sails.helpers.notifications.createOne.with({
          values: {
            userId,
            comment,
            type: mentionUserIdsSet.has(userId)
              ? Notification.Types.MENTION_IN_COMMENT
              : Notification.Types.COMMENT_CARD,
            data: {
              card: _.pick(values.card, ['name']),
              text: comment.text,
            },
            creatorUser: values.user,
            card: values.card,
          },
          project: inputs.project,
          board: inputs.board,
          list: inputs.list,
        }),
      ),
    );

    if (values.user.subscribeToCardWhenCommenting) {
      let cardSubscription;
      try {
        cardSubscription = await CardSubscription.qm.createOne({
          cardId: comment.cardId,
          userId: comment.userId,
        });
      } catch (error) {
        if (error.code !== 'E_UNIQUE') {
          throw error;
        }
      }

      if (cardSubscription) {
        sails.sockets.broadcast(`user:${comment.userId}`, 'cardUpdate', {
          item: {
            id: comment.cardId,
            isSubscribed: true,
          },
        });

        // TODO: send webhooks
      }
    }

    return comment;
  },
};
