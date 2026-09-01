const { idInput } = require('../../../utils/inputs');

const Errors = {
  GANTT_PLAN_NOT_FOUND: { ganttPlanNotFound: 'Gantt plan not found' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    search: {
      type: 'string',
      defaultsTo: '',
    },
    boardId: idInput,
  },

  exits: {
    ganttPlanNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const plan = await GanttPlan.qm.getOneById(inputs.id);
    const project = plan && (await Project.qm.getOneById(plan.projectId));
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));
    if (!plan || !plan.isEnabled || !access) {
      throw Errors.GANTT_PLAN_NOT_FOUND;
    }

    const boards = await Board.qm.getByProjectId(project.id);
    const filteredBoards = inputs.boardId
      ? boards.filter(({ id }) => id === inputs.boardId)
      : boards;

    const boardIds = filteredBoards.map(({ id }) => id);
    const lists = boardIds.length
      ? await List.find({ boardId: boardIds, type: List.FINITE_TYPES }).sort(['position', 'id'])
      : [];
    const cards = lists.length ? await Card.qm.getByListIds(lists.map(({ id }) => id)) : [];
    const taskLists = cards.length ? await TaskList.qm.getByCardIds(cards.map(({ id }) => id)) : [];
    let tasks = taskLists.length
      ? await Task.qm.getByTaskListIds(taskLists.map(({ id }) => id))
      : [];

    const search = inputs.search.trim().toLocaleLowerCase();
    const taskListsById = _.keyBy(taskLists, 'id');
    const cardsById = _.keyBy(cards, 'id');
    const boardsById = _.keyBy(boards, 'id');
    if (search) {
      tasks = tasks.filter((task) => {
        const taskList = taskListsById[task.taskListId];
        const card = taskList && cardsById[taskList.cardId];
        return [task.name, taskList && taskList.name, card && card.name]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(search));
      });
    }

    const linkedItems = tasks.length
      ? await GanttItem.qm.getBySourceTaskIds(tasks.map(({ id }) => id))
      : [];
    const linkedItemsByTaskId = _.keyBy(linkedItems, 'sourceTaskId');
    const linkedCardItems = cards.length
      ? await GanttItem.qm.getBySourceCardIds(cards.map(({ id }) => id))
      : [];
    const linkedItemsByCardId = _.keyBy(linkedCardItems, 'sourceCardId');

    const availableCards = cards
      .filter((card) => {
        if (!search) {
          return true;
        }
        const list = lists.find(({ id }) => id === card.listId);
        return [card.name, list && list.name]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(search));
      })
      .map((card) => {
        const list = lists.find(({ id }) => id === card.listId);
        const board = boardsById[card.boardId];
        return {
          id: card.id,
          name: card.name,
          listName: list && list.name,
          boardId: board.id,
          boardName: board.name,
          ganttItemId: (linkedItemsByCardId[card.id] && linkedItemsByCardId[card.id].id) || null,
        };
      });

    return {
      items: tasks.map((task) => {
        const taskList = taskListsById[task.taskListId];
        const card = cardsById[taskList.cardId];
        const board = boardsById[card.boardId];
        return {
          id: task.id,
          name: task.name,
          isCompleted: task.isCompleted,
          assigneeUserId: task.assigneeUserId || null,
          assigneeUserIds: task.assigneeUserIds,
          taskListId: taskList.id,
          taskListName: taskList.name,
          cardId: card.id,
          cardName: card.name,
          boardId: board.id,
          boardName: board.name,
          ganttItemId: (linkedItemsByTaskId[task.id] && linkedItemsByTaskId[task.id].id) || null,
        };
      }),
      cards: availableCards,
      included: { boards },
      meta: { canImport: access.canEdit },
    };
  },
};
