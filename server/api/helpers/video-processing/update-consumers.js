/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const updateCardAttachments = async (fileReferenceId, videoData) => {
  const queryResult = await sails.sendNativeQuery(
    `UPDATE attachment
     SET data = jsonb_set(data, '{video}', $2::jsonb, true),
         updated_at = NOW()
     WHERE data->>'fileReferenceId' = $1::text
     RETURNING id, card_id AS "cardId"`,
    [fileReferenceId, JSON.stringify(videoData)],
  );

  await Promise.all(
    queryResult.rows.map(async ({ id, cardId }) => {
      const [attachment, card] = await Promise.all([
        Attachment.findOne(id),
        Card.qm.getOneById(cardId),
      ]);
      if (!attachment || !card) {
        return;
      }

      const list = await List.qm.getOneById(card.listId);
      if (!list) {
        return;
      }

      sails.sockets.broadcast(`board:${list.boardId}`, 'attachmentUpdate', {
        item: sails.helpers.attachments.presentOne(attachment),
      });
    }),
  );
};

const updateChatAttachments = async (fileReferenceId, videoData) => {
  const queryResult = await sails.sendNativeQuery(
    `UPDATE chat_message_attachment
     SET data = jsonb_set(data, '{video}', $2::jsonb, true),
         updated_at = NOW()
     WHERE file_reference_id = $1
     RETURNING message_id AS "messageId"`,
    [fileReferenceId, JSON.stringify(videoData)],
  );
  const messageIds = [...new Set(queryResult.rows.map(({ messageId }) => messageId))];

  await Promise.all(
    messageIds.map(async (messageId) => {
      let message = await ChatMessage.qm.getOneById(messageId);
      if (!message || message.deletedAt) {
        return;
      }

      const extras = await sails.helpers.chat.getMessageExtras([message.id]);
      message = {
        ...message,
        ...extras[message.id],
      };
      sails.sockets.broadcast(`chatConversation:${message.conversationId}`, 'chatMessageUpdate', {
        item: sails.helpers.chat.presentMessage(message),
      });
    }),
  );
};

module.exports = {
  inputs: {
    fileReferenceId: {
      type: 'string',
      required: true,
    },
    videoData: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return Promise.all([
      updateCardAttachments(inputs.fileReferenceId, inputs.videoData),
      updateChatAttachments(inputs.fileReferenceId, inputs.videoData),
    ]);
  },
};
