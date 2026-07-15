/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'chat_message',

  attributes: {
    text: {
      type: 'string',
      defaultsTo: '',
    },
    editedAt: {
      type: 'ref',
      columnName: 'edited_at',
    },
    deletedAt: {
      type: 'ref',
      columnName: 'deleted_at',
    },
    clientMessageId: {
      type: 'string',
      maxLength: 128,
      columnName: 'client_message_id',
    },
    replyToMessageId: {
      model: 'ChatMessage',
      columnName: 'reply_to_message_id',
    },
    forwardedFromMessageId: {
      model: 'ChatMessage',
      columnName: 'forwarded_from_message_id',
    },
    forwardedFromUserId: {
      model: 'User',
      columnName: 'forwarded_from_user_id',
    },
    conversationId: {
      model: 'ChatConversation',
      required: true,
      columnName: 'conversation_id',
    },
    userId: {
      model: 'User',
      columnName: 'user_id',
    },
  },
};
