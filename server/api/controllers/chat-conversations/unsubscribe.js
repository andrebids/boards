/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  async fn(inputs) {
    if (this.req.isSocket) {
      sails.sockets.leave(this.req, `chatConversation:${inputs.id}`);
    }

    return {};
  },
};
