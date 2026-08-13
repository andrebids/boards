module.exports = {
  inputs: {
    items: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const sourceTaskIds = _.uniq(
      inputs.items.map(({ sourceTaskId }) => sourceTaskId).filter(Boolean),
    );
    if (sourceTaskIds.length === 0) {
      return {};
    }

    const tasks = await Task.qm.getByIds(sourceTaskIds);
    const taskLists = await TaskList.qm.getByIds(_.uniq(tasks.map(({ taskListId }) => taskListId)));
    const taskListsById = _.keyBy(taskLists, 'id');
    const cards = await Card.qm.getByIds(_.uniq(taskLists.map(({ cardId }) => cardId)));
    const cardsById = _.keyBy(cards, 'id');
    const boards = await Board.qm.getByIds(_.uniq(cards.map(({ boardId }) => boardId)));
    const boardsById = _.keyBy(boards, 'id');

    return Object.fromEntries(
      tasks.flatMap((task) => {
        const taskList = taskListsById[task.taskListId];
        const card = taskList && cardsById[taskList.cardId];
        const board = card && boardsById[card.boardId];
        if (!taskList || !card || !board) {
          return [];
        }

        return [
          [
            task.id,
            {
              id: task.id,
              name: task.name,
              isCompleted: task.isCompleted,
              assigneeUserId: task.assigneeUserId || null,
              taskListId: taskList.id,
              taskListName: taskList.name,
              cardId: card.id,
              cardName: card.name,
              boardId: board.id,
              boardName: board.name,
            },
          ],
        ];
      }),
    );
  },
};
