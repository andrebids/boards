/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { normalizeStoredDate } = require('../../../utils/gantt-dates');

module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    assignees: {
      type: 'ref',
      defaultsTo: [],
    },
    sourceTask: {
      type: 'ref',
    },
    sourceCard: {
      type: 'ref',
    },
  },

  fn(inputs) {
    const presentedItem = {
      ..._.omit(inputs.record, ['progress']),
      startDate: normalizeStoredDate(inputs.record.startDate),
      endDate: normalizeStoredDate(inputs.record.endDate),
      assigneeUserIds: inputs.assignees.map(({ userId }) => userId),
    };

    if (inputs.sourceTask) {
      presentedItem.sourceTask = inputs.sourceTask;
    }
    if (inputs.sourceCard) {
      presentedItem.sourceCard = inputs.sourceCard;
    }

    return presentedItem;
  },
};
