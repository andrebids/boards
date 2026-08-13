/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { hasDependencyCycle } = require('../../../utils/gantt-links');

const Errors = {
  GANTT_ITEM_NOT_FOUND: { ganttItemNotFound: 'Gantt item not found' },
  INVALID_DEPENDENCIES: { invalidDependencies: 'Invalid Gantt dependencies' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    predecessorIds: {
      type: 'json',
      required: true,
    },
  },

  exits: {
    ganttItemNotFound: { responseType: 'notFound' },
    invalidDependencies: { responseType: 'unprocessableEntity' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const item = await GanttItem.qm.getOneById(inputs.id);
    const plan = item && (await GanttPlan.qm.getOneById(item.ganttPlanId));
    const project = plan && (await Project.qm.getOneById(plan.projectId));
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));

    if (!item || !plan || !plan.isEnabled || !access || item.itemType !== 'task') {
      throw Errors.GANTT_ITEM_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }
    if (!Array.isArray(inputs.predecessorIds)) {
      throw Errors.INVALID_DEPENDENCIES;
    }

    const predecessorIds = _.uniq(inputs.predecessorIds);
    const items = await GanttItem.qm.getByGanttPlanId(plan.id);
    const itemsById = _.keyBy(items, 'id');
    if (
      predecessorIds.some(
        (id) => id === item.id || !itemsById[id] || itemsById[id].itemType !== 'task',
      )
    ) {
      throw Errors.INVALID_DEPENDENCIES;
    }

    const currentLinks = await GanttLink.qm.getByGanttPlanId(plan.id);
    const proposedLinks = [
      ...currentLinks.filter(({ targetItemId }) => targetItemId !== item.id),
      ...predecessorIds.map((sourceItemId) => ({ sourceItemId, targetItemId: item.id })),
    ];
    if (
      hasDependencyCycle(
        items.map(({ id }) => id),
        proposedLinks,
      )
    ) {
      throw Errors.INVALID_DEPENDENCIES;
    }

    await sails.getDatastore().transaction(async (db) => {
      await GanttLink.destroy({ targetItemId: item.id }).usingConnection(db);
      if (predecessorIds.length > 0) {
        await GanttLink.createEach(
          predecessorIds.map((sourceItemId) => ({
            ganttPlanId: plan.id,
            sourceItemId,
            targetItemId: item.id,
            type: 'e2s',
          })),
        ).usingConnection(db);
      }
    });

    const links = await GanttLink.qm.getByGanttPlanId(plan.id);
    const payload = { items: links };
    sails.sockets.broadcast(`ganttPlan:${plan.id}`, 'ganttLinksUpdate', payload, this.req);

    return payload;
  },
};
