module.exports = {
  inputs: {
    parentTaskId: { type: 'string', required: true },
    board: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const visitedTaskIds = new Set();
    let { parentTaskId } = inputs;
    let lastParentTask = null;

    while (parentTaskId && !visitedTaskIds.has(parentTaskId)) {
      visitedTaskIds.add(parentTaskId);

      // eslint-disable-next-line no-await-in-loop
      let parentTask = await Task.qm.getOneById(parentTaskId);
      if (!parentTask) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      const children = await Task.qm.getByTaskListId(parentTask.taskListId, {
        parentTaskId: parentTask.id,
      });
      const isCompleted = children.length > 0 && children.every((child) => child.isCompleted);

      if (parentTask.isCompleted !== isCompleted) {
        // eslint-disable-next-line no-await-in-loop
        parentTask = await Task.qm.updateOne(parentTask.id, { isCompleted });
        sails.sockets.broadcast(`board:${inputs.board.id}`, 'taskUpdate', { item: parentTask });
      }

      lastParentTask = parentTask;
      parentTaskId = parentTask.parentTaskId;
    }

    return lastParentTask;
  },
};
