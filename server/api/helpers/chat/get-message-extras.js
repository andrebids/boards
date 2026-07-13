/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    messageIds: {
      type: 'ref',
      required: true,
    },
    userId: {
      type: 'string',
    },
  },

  async fn(inputs) {
    if (inputs.messageIds.length === 0) {
      return {};
    }

    const messages = await ChatMessage.find({ id: inputs.messageIds });
    const replyMessageIds = messages
      .map(({ replyToMessageId }) => replyToMessageId)
      .filter(Boolean);
    const [attachments, reactions, replyMessages, savedMessages, linkAssociations] =
      await Promise.all([
        ChatMessageAttachment.find({ messageId: inputs.messageIds }).sort('id'),
        ChatMessageReaction.find({ messageId: inputs.messageIds }).sort('id'),
        replyMessageIds.length > 0 ? ChatMessage.find({ id: replyMessageIds }) : [],
        inputs.userId
          ? ChatSavedMessage.qm.getByUserIdAndMessageIds(inputs.userId, inputs.messageIds)
          : [],
        ChatMessageLinkPreview.qm.getByMessageIds(inputs.messageIds),
      ]);

    const linkPreviews = await ChatLinkPreview.qm.getByIds([
      ...new Set(linkAssociations.map(({ linkPreviewId }) => linkPreviewId)),
    ]);
    const replyMessagesById = new Map(replyMessages.map((message) => [message.id, message]));
    const linkPreviewsById = new Map(linkPreviews.map((preview) => [preview.id, preview]));
    const savedMessageIds = new Set(savedMessages.map(({ messageId }) => messageId));

    const extrasByMessageId = Object.fromEntries(
      inputs.messageIds.map((messageId) => [
        messageId,
        {
          attachments: [],
          reactions: [],
          linkPreviews: [],
          isSaved: savedMessageIds.has(messageId),
        },
      ]),
    );
    const reactionsByMessageIdAndEmoji = new Map();

    attachments.forEach((attachment) => {
      if (extrasByMessageId[attachment.messageId]) {
        extrasByMessageId[attachment.messageId].attachments.push(
          sails.helpers.chatMessageAttachments.presentOne(attachment),
        );
      }
    });

    reactions.forEach((reaction) => {
      const key = `${reaction.messageId}\u0000${reaction.emoji}`;
      let groupedReaction = reactionsByMessageIdAndEmoji.get(key);
      if (!groupedReaction) {
        groupedReaction = { emoji: reaction.emoji, userIds: [] };
        reactionsByMessageIdAndEmoji.set(key, groupedReaction);
        if (extrasByMessageId[reaction.messageId]) {
          extrasByMessageId[reaction.messageId].reactions.push(groupedReaction);
        }
      }
      groupedReaction.userIds.push(reaction.userId);
    });

    messages.forEach((message) => {
      const repliedMessage = replyMessagesById.get(message.replyToMessageId);
      if (!repliedMessage || !extrasByMessageId[message.id]) {
        return;
      }

      extrasByMessageId[message.id].replyTo = repliedMessage.deletedAt
        ? {
            id: repliedMessage.id,
            userId: repliedMessage.userId,
            text: null,
            deletedAt: repliedMessage.deletedAt,
          }
        : {
            id: repliedMessage.id,
            userId: repliedMessage.userId,
            text: repliedMessage.text,
            deletedAt: null,
          };
    });

    linkAssociations.forEach((association) => {
      const preview = linkPreviewsById.get(association.linkPreviewId);
      if (
        preview &&
        preview.status === ChatLinkPreview.Statuses.READY &&
        extrasByMessageId[association.messageId]
      ) {
        extrasByMessageId[association.messageId].linkPreviews.push(preview);
      }
    });

    return extrasByMessageId;
  },
};
