/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'chat_saved_message',

  attributes: {
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
    messageId: {
      model: 'ChatMessage',
      required: true,
      columnName: 'message_id',
    },
  },
};
