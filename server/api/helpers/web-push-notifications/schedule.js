/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getTargets } = require('../../../utils/web-push-notifications');

module.exports = {
  inputs: {
    message: { type: 'ref', required: true },
    conversation: { type: 'ref', required: true },
    recipientUserIds: { type: 'ref', required: true },
    senderUserId: { type: 'string', required: true },
    hasAttachment: { type: 'boolean', defaultsTo: false },
    db: { type: 'ref' },
  },

  async fn(inputs) {
    if (
      !sails.config.custom.webPush ||
      !sails.config.custom.webPush.enabled ||
      (!inputs.message.text && !inputs.hasAttachment)
    ) {
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
      `INSERT INTO web_push_notification (
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
         NOW()
       FROM unnest($3::bigint[], $4::text[]) AS candidate(user_id, kind)
       JOIN user_account ON user_account.id = candidate.user_id
       JOIN LATERAL (
         SELECT 1
         FROM web_push_subscription
         WHERE web_push_subscription.user_id = candidate.user_id
           AND (
             web_push_subscription.expiration_time IS NULL
             OR web_push_subscription.expiration_time > EXTRACT(EPOCH FROM NOW()) * 1000
           )
         LIMIT 1
       ) subscription ON TRUE
       LEFT JOIN chat_participant participant
         ON participant.conversation_id = $2
        AND participant.user_id = candidate.user_id
       WHERE user_account.is_deactivated = FALSE
         AND user_account.notification_level <> 'none'
         AND (
           user_account.notification_level = 'all'
           OR candidate.kind IN ('mention', 'direct')
         )
         AND (
           participant.id IS NULL
           OR (
             participant.notification_level <> 'none'
             AND (participant.muted_until IS NULL OR participant.muted_until <= NOW())
             AND (
               participant.notification_level = 'all'
               OR candidate.kind = 'mention'
             )
           )
         )
       ON CONFLICT (message_id, user_id) DO NOTHING
       RETURNING id`,
      [
        inputs.message.id,
        inputs.conversation.id,
        targets.map(({ userId }) => userId),
        targets.map(({ kind }) => kind),
      ],
    );

    const result = inputs.db ? await query.usingConnection(inputs.db) : await query;
    return result.rowCount;
  },
};
