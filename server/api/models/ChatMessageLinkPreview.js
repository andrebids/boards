/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'chat_message_link_preview',

  attributes: {
    position: { type: 'number', defaultsTo: 0 },
    messageId: {
      model: 'ChatMessage',
      required: true,
      columnName: 'message_id',
    },
    linkPreviewId: {
      model: 'ChatLinkPreview',
      required: true,
      columnName: 'link_preview_id',
    },
  },
};
