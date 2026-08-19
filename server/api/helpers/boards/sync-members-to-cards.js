/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
    },
    list: {
      type: 'ref',
    },
    user: {
      type: 'ref',
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const cards = inputs.card ? [inputs.card] : await Card.qm.getByBoardId(inputs.board.id);
    const boardMemberships = inputs.user
      ? [{ userId: inputs.user.id }]
      : await BoardMembership.qm.getByBoardId(inputs.board.id);

    if (cards.length === 0 || boardMemberships.length === 0) {
      return;
    }

    const cardIds = sails.helpers.utils.mapRecords(cards);
    const existingCardMemberships = await CardMembership.qm.getByCardIds(cardIds);
    const existingKeys = new Set(
      existingCardMemberships.map(({ cardId, userId }) => `${cardId}:${userId}`),
    );

    const userIds = sails.helpers.utils.mapRecords(boardMemberships, 'userId');
    const users = inputs.user ? [inputs.user] : await User.qm.getByIds(userIds);
    const userById = Object.fromEntries(users.map((user) => [user.id, user]));

    const listIds = [...new Set(cards.map((card) => card.listId))];
    const lists = inputs.list ? [inputs.list] : await List.qm.getByIds(listIds);
    const listById = Object.fromEntries(lists.map((list) => [list.id, list]));

    const missingPairs = cards.flatMap((card) =>
      boardMemberships.flatMap(({ userId }) =>
        existingKeys.has(`${card.id}:${userId}`) ? [] : [{ card, userId }],
      ),
    );

    await Promise.all(
      missingPairs.map(async ({ card, userId }) => {
        try {
          await sails.helpers.cardMemberships.createOne.with({
            project: inputs.project,
            board: inputs.board,
            list: listById[card.listId],
            values: {
              card,
              user: userById[userId],
            },
            actorUser: inputs.actorUser,
          });
        } catch (error) {
          if (error !== 'userAlreadyCardMember') {
            throw error;
          }
        }
      }),
    );
  },
};
