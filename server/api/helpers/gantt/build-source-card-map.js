module.exports = {
  inputs: {
    items: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const sourceCardIds = _.uniq(
      inputs.items.map(({ sourceCardId }) => sourceCardId).filter(Boolean),
    );
    if (sourceCardIds.length === 0) {
      return {};
    }

    const cards = await Card.qm.getByIds(sourceCardIds);
    const lists = await List.find({ id: _.uniq(cards.map(({ listId }) => listId)) });
    const listsById = _.keyBy(lists, 'id');
    const boards = await Board.qm.getByIds(_.uniq(cards.map(({ boardId }) => boardId)));
    const boardsById = _.keyBy(boards, 'id');

    return Object.fromEntries(
      cards.map((card) => [
        card.id,
        {
          id: card.id,
          name: card.name,
          listId: card.listId,
          listName: listsById[card.listId] && listsById[card.listId].name,
          boardId: card.boardId,
          boardName: boardsById[card.boardId] && boardsById[card.boardId].name,
        },
      ]),
    );
  },
};
