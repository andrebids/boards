/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    ganttItemId: {
      type: 'string',
      required: true,
    },
    userIds: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    await GanttItemAssignee.qm.deleteByGanttItemId(inputs.ganttItemId);

    return GanttItemAssignee.qm.create(
      inputs.userIds.map((userId) => ({
        ganttItemId: inputs.ganttItemId,
        userId,
      })),
    );
  },
};
