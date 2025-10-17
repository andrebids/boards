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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    userAlreadyCardMember: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    let cardMembership;
    try {
      cardMembership = await CardMembership.qm.createOne({
        ...values,
        cardId: values.card.id,
        userId: values.user.id,
      });
      sails.log.info('🔍 [DIAGNÓSTICO_AVATARES] Helper - CardMembership criada:', {
        cardId: cardMembership.cardId,
        userId: cardMembership.userId,
        cardMembershipId: cardMembership.id,
      });
    } catch (error) {
      if (error.code === 'E_UNIQUE') {
        sails.log.warn('🔍 [DIAGNÓSTICO_AVATARES] Helper - User já é membro do card:', {
          cardId: values.card.id,
          userId: values.user.id,
        });
        throw 'userAlreadyCardMember';
      }

      throw error;
    }

    sails.log.info('🔍 [DIAGNÓSTICO_AVATARES] Helper - Enviando broadcast WebSocket:', {
      room: `board:${inputs.board.id}`,
      event: 'cardMembershipCreate',
      cardMembershipData: {
        id: cardMembership.id,
        cardId: cardMembership.cardId,
        userId: cardMembership.userId,
      },
    });
    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'cardMembershipCreate',
      {
        item: cardMembership,
      },
      inputs.request,
    );

    sails.helpers.utils.sendWebhooks.with({
      event: 'cardMembershipCreate',
      buildData: () => ({
        item: cardMembership,
        included: {
          users: [values.user],
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: inputs.actorUser,
    });

    let cardSubscription;
    try {
      cardSubscription = await CardSubscription.qm.createOne({
        cardId: cardMembership.cardId,
        userId: cardMembership.userId,
        isPermanent: false,
      });
    } catch (error) {
      if (error.code !== 'E_UNIQUE') {
        throw error;
      }
    }

    if (cardSubscription) {
      sails.sockets.broadcast(
        `user:${cardMembership.userId}`,
        'cardUpdate',
        {
          item: {
            id: cardMembership.cardId,
            isSubscribed: true,
          },
        },
        inputs.request,
      );

      // TODO: send webhooks
    }

    await sails.helpers.actions.createOne.with({
      values: {
        type: Action.Types.ADD_MEMBER_TO_CARD,
        data: {
          user: _.pick(values.user, ['id', 'name']),
          card: _.pick(values.card, ['name']),
        },
        user: inputs.actorUser,
        card: values.card,
      },
      project: inputs.project,
      board: inputs.board,
      list: inputs.list,
    });

    return cardMembership;
  },
};
