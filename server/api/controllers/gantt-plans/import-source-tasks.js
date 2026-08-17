const { idInput } = require('../../../utils/inputs');

const Errors = {
  GANTT_PLAN_NOT_FOUND: { ganttPlanNotFound: 'Gantt plan not found' },
  INVALID_TASKS: { invalidTasks: 'Tasks must belong to the Gantt project' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    taskIds: {
      type: 'json',
      defaultsTo: [],
    },
    cardIds: {
      type: 'json',
      defaultsTo: [],
    },
  },

  exits: {
    ganttPlanNotFound: { responseType: 'notFound' },
    invalidTasks: { responseType: 'unprocessableEntity' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const plan = await GanttPlan.qm.getOneById(inputs.id);
    const project = plan && (await Project.qm.getOneById(plan.projectId));
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));
    if (!plan || !plan.isEnabled || !access) {
      throw Errors.GANTT_PLAN_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }
    if (
      !Array.isArray(inputs.taskIds) ||
      !Array.isArray(inputs.cardIds) ||
      (inputs.taskIds.length === 0 && inputs.cardIds.length === 0)
    ) {
      throw Errors.INVALID_TASKS;
    }

    const taskIds = _.uniq(inputs.taskIds);
    const cardIds = _.uniq(inputs.cardIds);
    const paths = [];
    // Validate the full batch before creating anything.
    // eslint-disable-next-line no-restricted-syntax
    for (const taskId of taskIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const path = await sails.helpers.tasks.getPathToProjectById(taskId);
        if (path.project.id !== project.id) {
          throw new Error('wrong project');
        }
        paths.push(path);
      } catch (error) {
        throw Errors.INVALID_TASKS;
      }
    }

    const cardPaths = [];
    // Validate the full batch before creating anything.
    // eslint-disable-next-line no-restricted-syntax
    for (const cardId of cardIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const path = await sails.helpers.cards.getPathToProjectById(cardId);
        if (path.project.id !== project.id) {
          throw new Error('wrong project');
        }
        cardPaths.push(path);
      } catch (error) {
        throw Errors.INVALID_TASKS;
      }
    }

    const existingItems = await GanttItem.qm.getBySourceTaskIds(taskIds);
    const itemsByTaskId = _.keyBy(existingItems, 'sourceTaskId');
    const existingCardItems = await GanttItem.qm.getBySourceCardIds(cardIds);
    const itemsByCardId = _.keyBy(existingCardItems, 'sourceCardId');
    const planItems = await GanttItem.qm.getByGanttPlanId(plan.id);
    let position = planItems.length ? planItems.at(-1).position : 0;
    const createdItems = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const path of paths) {
      if (!itemsByTaskId[path.task.id]) {
        position += 65535;
        let item;
        try {
          // eslint-disable-next-line no-await-in-loop
          item = await GanttItem.qm.createOne({
            ganttPlanId: plan.id,
            sourceTaskId: path.task.id,
            task: path.task.name,
            itemType: GanttItem.Types.TASK,
            parentId: null,
            description: null,
            status: null,
            startDate: null,
            endDate: null,
            expectedDurationDays: 1,
            color: 'blue',
            position,
          });
        } catch (error) {
          // A concurrent import may have won the unique constraint.
          // eslint-disable-next-line no-await-in-loop
          item = await GanttItem.qm.getOneBySourceTaskId(path.task.id);
          if (!item) {
            throw error;
          }
        }

        itemsByTaskId[path.task.id] = item;
        if (!existingItems.some(({ id }) => id === item.id)) {
          const assigneeUserIds =
            path.task.assigneeUserId && access.memberUserIds.includes(path.task.assigneeUserId)
              ? [path.task.assigneeUserId]
              : [];
          // eslint-disable-next-line no-await-in-loop
          const assignees = await sails.helpers.gantt.syncItemAssignees(item.id, assigneeUserIds);
          const sourceTask = {
            id: path.task.id,
            name: path.task.name,
            isCompleted: path.task.isCompleted,
            assigneeUserId: path.task.assigneeUserId || null,
            taskListId: path.taskList.id,
            taskListName: path.taskList.name,
            cardId: path.card.id,
            cardName: path.card.name,
            boardId: path.board.id,
            boardName: path.board.name,
          };
          const presentedItem = sails.helpers.gantt.presentItem(item, assignees, sourceTask);
          createdItems.push(presentedItem);
          sails.sockets.broadcast(
            `ganttPlan:${plan.id}`,
            'ganttItemCreate',
            { item: presentedItem },
            this.req,
          );
        }
      }
    }

    // Cards are imported as normal schedulable Gantt tasks. Their checklist
    // tasks remain independently importable and are not automatically duplicated.
    // eslint-disable-next-line no-restricted-syntax
    for (const path of cardPaths) {
      if (!itemsByCardId[path.card.id]) {
        position += 65535;
        let item;
        try {
          // eslint-disable-next-line no-await-in-loop
          item = await GanttItem.qm.createOne({
            ganttPlanId: plan.id,
            sourceCardId: path.card.id,
            task: path.card.name,
            itemType: GanttItem.Types.TASK,
            parentId: null,
            description: null,
            status: null,
            startDate: null,
            endDate: null,
            expectedDurationDays: 1,
            color: 'blue',
            position,
          });
        } catch (error) {
          // A concurrent import may have won the unique constraint.
          // eslint-disable-next-line no-await-in-loop
          item = await GanttItem.qm.getOneBySourceCardId(path.card.id);
          if (!item) {
            throw error;
          }
        }

        itemsByCardId[path.card.id] = item;
        if (!existingCardItems.some(({ id }) => id === item.id)) {
          const cardItem = {
            id: path.card.id,
            name: path.card.name,
            boardId: path.board.id,
            boardName: path.board.name,
            listId: path.list.id,
            listName: path.list.name,
          };
          const presentedItem = sails.helpers.gantt.presentItem(item, [], null);
          presentedItem.sourceCard = cardItem;
          createdItems.push(presentedItem);
          sails.sockets.broadcast(
            `ganttPlan:${plan.id}`,
            'ganttItemCreate',
            { item: presentedItem },
            this.req,
          );
        }
      }
    }

    const sourceTasksById = await sails.helpers.gantt.buildSourceTaskMap(
      Object.values(itemsByTaskId),
    );
    const taskItems = await Promise.all(
      taskIds.map(async (taskId) => {
        const item = itemsByTaskId[taskId];
        const assignees = await GanttItemAssignee.qm.getByGanttItemIds([item.id]);
        return sails.helpers.gantt.presentItem(item, assignees, sourceTasksById[taskId]);
      }),
    );
    const cardItems = await Promise.all(
      cardIds.map(async (cardId) => {
        const item = itemsByCardId[cardId];
        const presentedItem = sails.helpers.gantt.presentItem(item, []);
        const path = cardPaths.find(({ card }) => card.id === cardId);
        presentedItem.sourceCard = {
          id: path.card.id,
          name: path.card.name,
          boardId: path.board.id,
          boardName: path.board.name,
          listId: path.list.id,
          listName: path.list.name,
        };
        return presentedItem;
      }),
    );

    return {
      items: [...taskItems, ...cardItems],
      meta: {
        createdTaskIds: createdItems.map(({ sourceTaskId }) => sourceTaskId),
        alreadyLinkedTaskIds: existingItems.map(({ sourceTaskId }) => sourceTaskId),
        createdCardIds: createdItems.map(({ sourceCardId }) => sourceCardId).filter(Boolean),
        alreadyLinkedCardIds: existingCardItems.map(({ sourceCardId }) => sourceCardId),
      },
    };
  },
};
