/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    conversationId: {
      type: 'string',
      required: true,
    },
    userIds: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    if (inputs.userIds.length === 0) {
      return {};
    }

    const result = await sails.sendNativeQuery(
      `SELECT recipients.user_id, COUNT(message.id)::integer AS unread_count
       FROM (
         SELECT DISTINCT unnest($2::bigint[]) AS user_id
       ) AS recipients
       LEFT JOIN chat_participant participant
         ON participant.conversation_id = $1
        AND participant.user_id = recipients.user_id
       LEFT JOIN chat_message message
         ON message.conversation_id = $1
        AND message.id > COALESCE(participant.last_read_message_id, 0)
        AND (message.user_id IS NULL OR message.user_id <> recipients.user_id)
        AND message.deleted_at IS NULL
       GROUP BY recipients.user_id`,
      [inputs.conversationId, inputs.userIds],
    );

    return Object.fromEntries(result.rows.map((row) => [row.user_id, row.unread_count]));
  },
};
