/*! Copyright (c) 2024 PLANKA Software GmbH */

module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return _.pick(inputs.record, ['id', 'expirationTime', 'createdAt', 'updatedAt']);
  },
};
