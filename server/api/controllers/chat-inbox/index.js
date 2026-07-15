/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    filter: {
      type: 'string',
      isIn: ['unread', 'mentions', 'all'],
      defaultsTo: 'all',
    },
    before: {
      type: 'string',
      maxLength: 512,
    },
    limit: {
      type: 'number',
      min: 1,
      max: 100,
      defaultsTo: 50,
    },
  },

  async fn(inputs) {
    return sails.helpers.chat.getInbox.with({
      user: this.req.currentUser,
      filter: inputs.filter,
      before: inputs.before,
      limit: inputs.limit,
    });
  },
};
