/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { normalizeItemDates } = require('../../../utils/gantt-dates');

const Errors = {
  CONFLICT: { conflict: 'Gantt item was updated by another user' },
  GANTT_ITEM_NOT_FOUND: { ganttItemNotFound: 'Gantt item not found' },
  INVALID_DATES: { invalidDates: 'Invalid Gantt dates or duration' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  USER_NOT_FOUND: { userNotFound: 'User not found in project' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    task: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1024,
    },
    parentId: {
      ...idInput,
      allowNull: true,
    },
    description: {
      type: 'string',
      maxLength: 4096,
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
    },
    color: {
      type: 'string',
      isIn: ['blue', 'green', 'orange', 'red', 'purple', 'teal', 'gray'],
      allowNull: true,
    },
    progress: {
      type: 'number',
      min: 0,
      max: 100,
    },
    position: {
      type: 'number',
      min: 0,
    },
    version: {
      type: 'number',
      min: 1,
      required: true,
    },
    assigneeUserIds: {
      type: 'json',
    },
  },

  exits: {
    conflict: { responseType: 'conflict' },
    ganttItemNotFound: { responseType: 'notFound' },
    invalidDates: { responseType: 'unprocessableEntity' },
    notEnoughRights: { responseType: 'forbidden' },
    userNotFound: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    let item = await GanttItem.qm.getOneById(inputs.id);
    const plan = item && (await GanttPlan.qm.getOneById(item.ganttPlanId));
    const projectRecord = plan && (await Project.qm.getOneById(plan.projectId));
    const access =
      projectRecord && (await sails.helpers.gantt.getProjectAccess(projectRecord, currentUser));

    if (!item || !plan || !plan.isEnabled || !access) {
      throw Errors.GANTT_ITEM_NOT_FOUND;
    }
    if (!access.canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }
    if (item.version !== inputs.version) {
      throw Errors.CONFLICT;
    }

    if (inputs.parentId !== undefined) {
      const parent = inputs.parentId && (await GanttItem.qm.getOneById(inputs.parentId));
      if (
        item.itemType !== 'task' ||
        (inputs.parentId &&
          (!parent || parent.ganttPlanId !== plan.id || parent.itemType !== 'summary'))
      ) {
        throw Errors.GANTT_ITEM_NOT_FOUND;
      }
    }

    let assigneeUserIds;
    if (inputs.assigneeUserIds !== undefined) {
      if (!Array.isArray(inputs.assigneeUserIds)) {
        throw Errors.USER_NOT_FOUND;
      }

      assigneeUserIds = _.uniq(inputs.assigneeUserIds);
      if (assigneeUserIds.some((userId) => !access.memberUserIds.includes(userId))) {
        throw Errors.USER_NOT_FOUND;
      }
    }

    const values = _.pick(inputs, [
      'task',
      'parentId',
      'description',
      'status',
      'color',
      'progress',
      'position',
    ]);
    ['task', 'description', 'status'].forEach((key) => {
      if (typeof values[key] === 'string') {
        values[key] = values[key].trim() || null;
      }
    });

    if (
      item.itemType === 'task' &&
      (inputs.startDate !== undefined ||
        inputs.endDate !== undefined ||
        inputs.expectedDurationDays !== undefined)
    ) {
      try {
        Object.assign(
          values,
          normalizeItemDates({
            current: item,
            values: _.pick(inputs, ['startDate', 'endDate', 'expectedDurationDays']),
          }),
        );
      } catch (error) {
        throw Errors.INVALID_DATES;
      }
    }

    values.version = item.version + 1;
    item = await GanttItem.qm.updateOne({ id: item.id, version: inputs.version }, values);
    if (!item) {
      throw Errors.CONFLICT;
    }

    let assignees = await GanttItemAssignee.qm.getByGanttItemIds([item.id]);
    if (assigneeUserIds) {
      assignees = await sails.helpers.gantt.syncItemAssignees(item.id, assigneeUserIds);
    }

    const presentedItem = sails.helpers.gantt.presentItem(item, assignees);
    const payload = { item: presentedItem };
    sails.sockets.broadcast(`ganttPlan:${plan.id}`, 'ganttItemUpdate', payload, this.req);

    return payload;
  },
};
