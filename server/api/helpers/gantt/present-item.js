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
  },

  fn(inputs) {
    return {
      ...inputs.record,
      startDate: normalizeStoredDate(inputs.record.startDate),
      endDate: normalizeStoredDate(inputs.record.endDate),
      assigneeUserIds: inputs.assignees.map(({ userId }) => userId),
    };
  },
};
