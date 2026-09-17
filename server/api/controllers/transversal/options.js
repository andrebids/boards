const { idInput } = require('../../../utils/inputs');
const { groupLists } = require('../../../utils/transversal-view');

module.exports = {
  inputs: { projectId: { ...idInput, required: true }, boardId: idInput },
  exits: { projectNotFound: { responseType: 'notFound' } },

  async fn({ projectId, boardId }) {
    const { boards, lists } = await sails.helpers.transversal
      .getContext(projectId, this.req.currentUser)
      .intercept('notFound', () => ({ projectNotFound: 'Project not found' }));
    if (boardId && !boards.some(({ id }) => id === boardId)) {
      throw { projectNotFound: 'Project not found' };
    }
    const selectedLists = boardId ? lists.filter((list) => list.boardId === boardId) : lists;
    return {
      items: groupLists(selectedLists).map(({ key, name }) => ({ key, name })),
      included: { boards: boards.map(({ id, name }) => ({ id, name })) },
    };
  },
};
