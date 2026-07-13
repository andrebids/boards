/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'chat_message_attachment',

  attributes: {
    name: {
      type: 'string',
      required: true,
      maxLength: 255,
    },
    data: {
      type: 'json',
      required: true,
    },
    messageId: {
      model: 'ChatMessage',
      required: true,
      columnName: 'message_id',
    },
    creatorUserId: {
      model: 'User',
      columnName: 'creator_user_id',
    },
    fileReferenceId: {
      model: 'FileReference',
      required: true,
      columnName: 'file_reference_id',
    },
  },
};
