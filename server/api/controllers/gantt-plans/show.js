/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
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
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);
    const access = project && (await sails.helpers.gantt.getProjectAccess(project, currentUser));

    if (!access) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const plan = await GanttPlan.qm.getOneByProjectId(project.id);
    let items = [];
    let assignees = [];

    if (plan) {
      items = await GanttItem.qm.getByGanttPlanId(plan.id);
      assignees = await GanttItemAssignee.qm.getByGanttItemIds(
        sails.helpers.utils.mapRecords(items),
      );

      if (this.req.isSocket) {
        sails.sockets.join(this.req, `ganttPlan:${plan.id}`);
      }
    }

    const assigneesByItemId = _.groupBy(assignees, 'ganttItemId');
    const users = await User.qm.getByIds(access.memberUserIds);

    return {
      item: plan || null,
      included: {
        ganttItems: items.map((item) =>
          sails.helpers.gantt.presentItem(item, assigneesByItemId[item.id] || []),
        ),
        users: sails.helpers.users.presentMany(users, currentUser),
      },
      meta: {
        canEdit: access.canEdit,
      },
    };
  },
};
