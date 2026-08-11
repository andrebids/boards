/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    recordOrRecords: {
      type: 'ref',
      required: true,
    },
    connection: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let customFieldGroupIdOrIds;
    if (_.isPlainObject(inputs.recordOrRecords)) {
      ({
        recordOrRecords: { id: customFieldGroupIdOrIds },
      } = inputs);
    } else if (_.every(inputs.recordOrRecords, _.isPlainObject)) {
      customFieldGroupIdOrIds = sails.helpers.utils.mapRecords(inputs.recordOrRecords);
    }

    let query = CustomFieldValue.qm.delete({
      customFieldGroupId: customFieldGroupIdOrIds,
    });
    await (inputs.connection ? query.usingConnection(inputs.connection) : query);

    query = CustomField.qm.delete({
      customFieldGroupId: customFieldGroupIdOrIds,
    });
    await (inputs.connection ? query.usingConnection(inputs.connection) : query);
  },
};
