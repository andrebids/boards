module.exports = {
  inputs: {
    parentTaskId: { type: 'string', required: true },
    board: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const parentTask = await Task.qm.getOneById(inputs.parentTaskId);
    if (!parentTask) {
      return null;
    }

    const children = await Task.qm.getByTaskListId(parentTask.taskListId, {
      parentTaskId: parentTask.id,
    });
    const isCompleted = children.length > 0 && children.every((child) => child.isCompleted);

    if (parentTask.isCompleted === isCompleted) {
      return parentTask;
    }

    const task = await Task.qm.updateOne(parentTask.id, { isCompleted });
    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'taskUpdate',
      { item: task },
      inputs.request,
    );
    return task;
  },
};
