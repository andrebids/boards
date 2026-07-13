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
    const hasSavedState = Object.prototype.hasOwnProperty.call(inputs.message, 'isSaved');
    if (!inputs.message.deletedAt) {
      const item = {
        ...inputs.message,
        attachments: inputs.message.attachments || [],
        reactions: inputs.message.reactions || [],
        linkPreviews: inputs.message.linkPreviews || [],
        replyTo: inputs.message.replyTo || null,
      };
      if (hasSavedState) {
        item.isSaved = !!inputs.message.isSaved;
      }
      return item;
    }

    const item = {
      ...inputs.message,
      text: null,
      attachments: [],
      reactions: [],
      linkPreviews: [],
      replyTo: null,
    };
    if (hasSavedState) {
      item.isSaved = !!inputs.message.isSaved;
    }
    return item;
  },
};
