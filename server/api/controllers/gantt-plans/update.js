/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  GANTT_PLAN_NOT_FOUND: { ganttPlanNotFound: 'Gantt plan not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    defaultZoomLevel: {
      type: 'string',
      isIn: Object.values(GanttPlan.ZoomLevels),
    },
  },

  exits: {
    ganttPlanNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    let plan = await GanttPlan.qm.getOneById(inputs.id);
    const project = plan && (await Project.qm.getOneById(plan.projectId));
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));

    if (!plan || !access) {
      throw Errors.GANTT_PLAN_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    plan = await GanttPlan.qm.updateOne(plan.id, _.pick(inputs, ['defaultZoomLevel']));
    const payload = { item: plan };
    sails.sockets.broadcast(`ganttPlan:${plan.id}`, 'ganttPlanUpdate', payload, this.req);

    return payload;
  },
};
