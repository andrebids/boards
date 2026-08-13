/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    recordOrRecords: {
      type: 'ref',
      required: true,
    },
    connection: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let taskListIdOrIds;
    if (_.isPlainObject(inputs.recordOrRecords)) {
      ({
        recordOrRecords: { id: taskListIdOrIds },
      } = inputs);
    } else if (_.every(inputs.recordOrRecords, _.isPlainObject)) {
      taskListIdOrIds = sails.helpers.utils.mapRecords(inputs.recordOrRecords);
    }

    const tasks = await Task.qm.getByTaskListIds(
      Array.isArray(taskListIdOrIds) ? taskListIdOrIds : [taskListIdOrIds],
    );
    const linkedItems = tasks.length
      ? await GanttItem.qm.getBySourceTaskIds(tasks.map(({ id }) => id))
      : [];

    const query = Task.qm.delete({
      taskListId: taskListIdOrIds,
    });

    await (inputs.connection ? query.usingConnection(inputs.connection) : query);

    if (!inputs.connection && linkedItems.length > 0) {
      await sails.helpers.gantt.broadcastDetachedItems(linkedItems);
    }
  },
};
