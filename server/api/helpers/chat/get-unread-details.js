/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    conversationIds: {
      type: 'ref',
      required: true,
    },
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    if (inputs.conversationIds.length === 0) {
      return {};
    }

    const mentionToken = `](${inputs.userId})`;
    const result = await sails.sendNativeQuery(
      `SELECT c.id AS conversation_id,
              COUNT(m.id)::integer AS unread_count,
              MIN(m.id) AS first_unread_message_id,
              COALESCE(BOOL_OR(STRPOS(COALESCE(m.text, ''), $3) > 0), FALSE)
                AS has_unread_mention
       FROM chat_conversation c
       LEFT JOIN chat_participant p
         ON p.conversation_id = c.id AND p.user_id = $1
       LEFT JOIN chat_message m
         ON m.conversation_id = c.id
        AND m.id > COALESCE(p.last_read_message_id, 0)
        AND (m.user_id IS NULL OR m.user_id <> $1)
        AND m.deleted_at IS NULL
       WHERE c.id = ANY($2::bigint[])
       GROUP BY c.id`,
      [inputs.userId, inputs.conversationIds, mentionToken],
    );

    return result.rows.reduce(
      (detailsByConversationId, row) => ({
        ...detailsByConversationId,
        [row.conversation_id]: {
          unreadCount: row.unread_count,
          firstUnreadMessageId: row.first_unread_message_id || null,
          hasUnreadMention: row.has_unread_mention,
        },
      }),
      {},
    );
  },
};
