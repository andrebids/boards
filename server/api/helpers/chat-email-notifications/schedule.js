/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getTargets } = require('../../../utils/chat-email-notifications');

module.exports = {
  inputs: {
    message: {
      type: 'ref',
      required: true,
    },
    conversation: {
      type: 'ref',
      required: true,
    },
    recipientUserIds: {
      type: 'ref',
      required: true,
    },
    senderUserId: {
      type: 'string',
      required: true,
    },
    db: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    if (!sails.config.custom.chatEmailNotificationsEnabled) {
      return 0;
    }

    const targets = getTargets(
      inputs.conversation,
      inputs.recipientUserIds,
      inputs.senderUserId,
      inputs.message.text,
    );
    if (targets.length === 0) {
      return 0;
    }

    const query = sails.sendNativeQuery(
      `INSERT INTO chat_email_notification (
         message_id,
         conversation_id,
         user_id,
         kind,
         scheduled_at
       )
       SELECT
         $1,
         $2,
         candidate.user_id,
         candidate.kind,
         message.created_at + ($5 * INTERVAL '1 second')
       FROM unnest($3::bigint[], $4::text[]) AS candidate(user_id, kind)
       JOIN chat_message message ON message.id = $1
       LEFT JOIN chat_participant participant
         ON participant.conversation_id = $2
        AND participant.user_id = candidate.user_id
       WHERE (
         participant.id IS NULL
         OR (
           participant.notification_level <> 'none'
           AND (participant.muted_until IS NULL OR participant.muted_until <= NOW())
         )
       )
         AND (
           participant.id IS NULL
           OR
           participant.notification_level = 'all'
           OR candidate.kind = 'mention'
         )
       ON CONFLICT (message_id, user_id) DO NOTHING
       RETURNING id`,
      [
        inputs.message.id,
        inputs.conversation.id,
        targets.map(({ userId }) => userId),
        targets.map(({ kind }) => kind),
        sails.config.custom.chatEmailNotificationDelaySeconds,
      ],
    );

    const result = inputs.db ? await query.usingConnection(inputs.db) : await query;
    return result.rowCount;
  },
};
