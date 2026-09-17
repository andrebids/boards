const { idInput } = require('../../../utils/inputs');
const { normalizeStage, PAGE_SIZE } = require('../../../utils/transversal-view');

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    stage: { type: 'string', required: true, maxLength: 256 },
    boardId: idInput,
    after: idInput,
  },
  exits: { projectNotFound: { responseType: 'notFound' } },

  async fn({ projectId, stage, boardId, after }) {
    const { boards, lists } = await sails.helpers.transversal
      .getContext(projectId, this.req.currentUser)
      .intercept('notFound', () => ({ projectNotFound: 'Project not found' }));
    if (boardId && !boards.some(({ id }) => id === boardId)) {
      throw { projectNotFound: 'Project not found' };
    }
    const stageKey = normalizeStage(stage);
    const selectedLists = lists.filter(
      (list) =>
        stageKey &&
        normalizeStage(list.name) === stageKey &&
        (!boardId || list.boardId === boardId),
    );
    if (!selectedLists.length) return { items: [], nextCursor: null };

    const where = {
      listId: selectedLists.map(({ id }) => id),
      boardId: boardId || boards.map(({ id }) => id),
    };
    if (after) where.id = { '>': after };
    const rows = await Card.find({
      where,
      select: ['id', 'name', 'boardId', 'listId', 'dueDate'],
    })
      .sort('id ASC')
      .limit(PAGE_SIZE + 1);
    const cards = rows.slice(0, PAGE_SIZE);
    const memberships = cards.length
      ? await CardMembership.qm.getByCardIds(cards.map(({ id }) => id))
      : [];
    const users = memberships.length
      ? await User.qm.getByIds([...new Set(memberships.map(({ userId }) => userId))])
      : [];
    const usersById = new Map(users.map((user) => [user.id, { id: user.id, name: user.name }]));
    const membersByCard = new Map();
    memberships.forEach(({ cardId, userId }) => {
      if (!membersByCard.has(cardId)) membersByCard.set(cardId, []);
      if (usersById.has(userId)) membersByCard.get(cardId).push(usersById.get(userId));
    });
    const boardsById = new Map(boards.map((board) => [board.id, board.name]));
    const listsById = new Map(selectedLists.map((list) => [list.id, list.name]));
    return {
      items: cards.map((card) => ({
        ...card,
        boardName: boardsById.get(card.boardId),
        listName: listsById.get(card.listId),
        members: membersByCard.get(card.id) || [],
      })),
      nextCursor: rows.length > PAGE_SIZE ? cards[cards.length - 1].id : null,
    };
  },
};
