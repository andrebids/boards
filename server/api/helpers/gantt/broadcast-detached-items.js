module.exports = {
  inputs: {
    items: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    if (inputs.items.length === 0) {
      return;
    }

    const assignees = await GanttItemAssignee.qm.getByGanttItemIds(
      inputs.items.map(({ id }) => id),
    );
    const assigneesByItemId = _.groupBy(assignees, 'ganttItemId');
    inputs.items.forEach((item) => {
      const detachedItem = { ...item, sourceTaskId: null };
      sails.sockets.broadcast(
        `ganttPlan:${item.ganttPlanId}`,
        'ganttItemUpdate',
        {
          item: sails.helpers.gantt.presentItem(detachedItem, assigneesByItemId[item.id] || []),
        },
        inputs.request,
      );
    });
  },
};
