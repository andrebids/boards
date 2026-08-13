/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { normalizeItemDates } = require('../../../utils/gantt-dates');

const Errors = {
  GANTT_PLAN_NOT_FOUND: { ganttPlanNotFound: 'Gantt plan not found' },
  INVALID_DATES: { invalidDates: 'Invalid Gantt dates or duration' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  USER_NOT_FOUND: { userNotFound: 'User not found in project' },
};

module.exports = {
  inputs: {
    ganttPlanId: {
      ...idInput,
      required: true,
    },
    task: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1024,
      required: true,
    },
    project: {
      type: 'string',
      maxLength: 256,
      allowNull: true,
    },
    status: {
      type: 'string',
      maxLength: 128,
      allowNull: true,
    },
    startDate: {
      type: 'string',
      allowNull: true,
    },
    endDate: {
      type: 'string',
      allowNull: true,
    },
    expectedDurationDays: {
      type: 'number',
      min: 1,
      defaultsTo: 1,
    },
    color: {
      type: 'string',
      maxLength: 32,
      allowNull: true,
    },
    assigneeUserIds: {
      type: 'json',
      defaultsTo: [],
    },
  },

  exits: {
    ganttPlanNotFound: { responseType: 'notFound' },
    invalidDates: { responseType: 'unprocessableEntity' },
    notEnoughRights: { responseType: 'forbidden' },
    userNotFound: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const plan = await GanttPlan.qm.getOneById(inputs.ganttPlanId);
    const projectRecord = plan && (await Project.qm.getOneById(plan.projectId));
    const access =
      projectRecord && (await sails.helpers.gantt.getProjectAccess(projectRecord, currentUser));

    if (!plan || !plan.isEnabled || !access) {
      throw Errors.GANTT_PLAN_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (!Array.isArray(inputs.assigneeUserIds)) {
      throw Errors.USER_NOT_FOUND;
    }

    const assigneeUserIds = _.uniq(inputs.assigneeUserIds);
    if (assigneeUserIds.some((userId) => !access.memberUserIds.includes(userId))) {
      throw Errors.USER_NOT_FOUND;
    }

    let dates;
    try {
      dates = normalizeItemDates({
        values: {
          startDate: inputs.startDate || null,
          endDate: inputs.endDate || null,
          expectedDurationDays: inputs.expectedDurationDays,
        },
      });
    } catch (error) {
      throw Errors.INVALID_DATES;
    }

    const items = await GanttItem.qm.getByGanttPlanId(plan.id);
    const position = items.length > 0 ? items[items.length - 1].position + 65535 : 65535;
    const item = await GanttItem.qm.createOne({
      ganttPlanId: plan.id,
      task: inputs.task.trim(),
      project: inputs.project ? inputs.project.trim() : null,
      status: inputs.status ? inputs.status.trim() : null,
      color: inputs.color || null,
      position,
      ...dates,
    });
    const assignees = await sails.helpers.gantt.syncItemAssignees(item.id, assigneeUserIds);
    const presentedItem = sails.helpers.gantt.presentItem(item, assignees);
    const payload = { item: presentedItem };

    sails.sockets.broadcast(`ganttPlan:${plan.id}`, 'ganttItemCreate', payload, this.req);

    return payload;
  },
};
