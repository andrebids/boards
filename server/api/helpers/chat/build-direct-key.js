/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  inputs: {
    userId: {
      type: 'string',
      required: true,
    },
    otherUserId: {
      type: 'string',
      required: true,
    },
  },

  fn(inputs) {
    return [inputs.userId, inputs.otherUserId]
      .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1))
      .join(':');
  },
};
