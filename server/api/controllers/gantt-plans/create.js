/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));

    if (!access) {
      throw Errors.PROJECT_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let plan = await GanttPlan.qm.getOneByProjectId(project.id);
    if (plan) {
      if (!plan.isEnabled) {
        plan = await GanttPlan.qm.updateOne(plan.id, { isEnabled: true });
      }
    } else {
      plan = await GanttPlan.qm.createOne({
        projectId: project.id,
        createdByUserId: currentUser.id,
      });
    }

    const payload = {
      item: plan,
      included: {
        ganttItems: [],
        ganttLinks: [],
      },
      meta: {
        canEdit: true,
      },
    };

    access.memberUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'ganttPlanUpdate', payload, this.req);
    });

    if (this.req.isSocket) {
      sails.sockets.join(this.req, `ganttPlan:${plan.id}`);
    }

    return payload;
  },
};
