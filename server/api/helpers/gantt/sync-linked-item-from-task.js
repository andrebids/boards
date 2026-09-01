const { getTaskAssigneeUserIds } = require('../../../utils/task-assignees');

module.exports = {
  inputs: {
    task: { type: 'ref', required: true },
    taskList: { type: 'ref', required: true },
    card: { type: 'ref', required: true },
    board: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    let item = await GanttItem.qm.getOneBySourceTaskId(inputs.task.id);
    if (!item) {
      return null;
    }

    item = await GanttItem.qm.updateOne(item.id, {
      task: inputs.task.name,
      version: item.version + 1,
    });
    const assignees = await sails.helpers.gantt.syncItemAssignees(
      item.id,
      getTaskAssigneeUserIds(inputs.task),
    );
    const sourceTask = {
      id: inputs.task.id,
      name: inputs.task.name,
      isCompleted: inputs.task.isCompleted,
      assigneeUserId: inputs.task.assigneeUserId || null,
      assigneeUserIds: getTaskAssigneeUserIds(inputs.task),
      taskListId: inputs.taskList.id,
      taskListName: inputs.taskList.name,
      cardId: inputs.card.id,
      cardName: inputs.card.name,
      boardId: inputs.board.id,
      boardName: inputs.board.name,
    };
    const presentedItem = sails.helpers.gantt.presentItem(item, assignees, sourceTask);
    sails.sockets.broadcast(
      `ganttPlan:${item.ganttPlanId}`,
      'ganttItemUpdate',
      { item: presentedItem },
      inputs.request,
    );
    return presentedItem;
  },
};
