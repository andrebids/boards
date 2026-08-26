/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'web_push_notification',

  attributes: {
    kind: { type: 'string', required: true },
    status: { type: 'string', required: true },
    scheduledAt: { type: 'ref', columnName: 'scheduled_at' },
    attempts: { type: 'number', required: true },
    lastError: { type: 'string', allowNull: true, columnName: 'last_error' },
    sentAt: { type: 'ref', columnName: 'sent_at' },
    messageId: { model: 'ChatMessage', required: true, columnName: 'message_id' },
    conversationId: {
      model: 'ChatConversation',
      required: true,
      columnName: 'conversation_id',
    },
    userId: { model: 'User', required: true, columnName: 'user_id' },
  },
};
