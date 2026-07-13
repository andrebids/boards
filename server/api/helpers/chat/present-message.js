/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  inputs: {
    message: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    if (!inputs.message.deletedAt) {
      return {
        ...inputs.message,
        attachments: inputs.message.attachments || [],
        reactions: inputs.message.reactions || [],
        linkPreviews: inputs.message.linkPreviews || [],
        replyTo: inputs.message.replyTo || null,
        isSaved: !!inputs.message.isSaved,
      };
    }

    return {
      ...inputs.message,
      text: null,
      attachments: [],
      reactions: [],
      linkPreviews: [],
      replyTo: null,
      isSaved: false,
    };
  },
};
