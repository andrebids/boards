/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { getDescendantIds, lockPlan } = require('../../../utils/gantt-hierarchy');

const Errors = {
  GANTT_ITEM_NOT_FOUND: { ganttItemNotFound: 'Gantt item not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    ganttItemNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const item = await GanttItem.qm.getOneById(inputs.id);
    const plan = item && (await GanttPlan.qm.getOneById(item.ganttPlanId));
    const project = plan && (await Project.qm.getOneById(plan.projectId));
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));

    if (!item || !plan || !access) {
      throw Errors.GANTT_ITEM_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const { deletedItem, deletedItemIds } = await sails.getDatastore().transaction(async (db) => {
      await lockPlan(plan.id, db);
      const items = await GanttItem.find({ ganttPlanId: plan.id }).usingConnection(db);
      const ids = [item.id, ...getDescendantIds(items, item.id)];
      const deleted = await GanttItem.destroyOne(item.id).usingConnection(db);
      if (!deleted) throw Errors.GANTT_ITEM_NOT_FOUND;
      return { deletedItem: deleted, deletedItemIds: ids };
    });
    const payload = {
      item: deletedItem,
      included: {
        deletedItemIds,
      },
    };
    sails.sockets.broadcast(`ganttPlan:${plan.id}`, 'ganttItemDelete', payload, this.req);

    return payload;
  },
};
