/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { isHistoricalExtraVisible } = require('../../../utils/chat-history');

module.exports = {
  inputs: {
    messageIds: {
      type: 'ref',
      required: true,
    },
    userId: {
      type: 'string',
    },
    participant: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    if (inputs.messageIds.length === 0) {
      return {};
    }

    const loadedMessages = await ChatMessage.find({ id: inputs.messageIds });
    const messages = inputs.participant
      ? loadedMessages.filter((message) =>
          sails.helpers.chat.isMessageVisible(message, inputs.participant),
        )
      : loadedMessages;
    const visibleMessageIds = messages.map(({ id }) => id);
    const replyMessageIds = messages
      .map(({ replyToMessageId }) => replyToMessageId)
      .filter(Boolean);
    const [attachments, reactions, replyMessages, linkAssociations] = await Promise.all([
      ChatMessageAttachment.find({ messageId: visibleMessageIds }).sort('id'),
      ChatMessageReaction.find({ messageId: visibleMessageIds }).sort('id'),
      replyMessageIds.length > 0 ? ChatMessage.find({ id: replyMessageIds }) : [],
      ChatMessageLinkPreview.qm.getByMessageIds(visibleMessageIds),
    ]);
    const isExtraVisible = (extra) => isHistoricalExtraVisible(extra, inputs.participant);

    const linkPreviews = await ChatLinkPreview.qm.getByIds([
      ...new Set(linkAssociations.map(({ linkPreviewId }) => linkPreviewId)),
    ]);
    const replyMessagesById = new Map(
      replyMessages
        .filter(
          (message) =>
            !inputs.participant || sails.helpers.chat.isMessageVisible(message, inputs.participant),
        )
        .map((message) => [message.id, message]),
    );
    const linkPreviewsById = new Map(linkPreviews.map((preview) => [preview.id, preview]));

    const extrasByMessageId = Object.fromEntries(
      inputs.messageIds.map((messageId) => {
        const extras = {
          attachments: [],
          reactions: [],
          linkPreviews: [],
        };
        return [messageId, extras];
      }),
    );
    const reactionsByMessageIdAndEmoji = new Map();

    attachments.filter(isExtraVisible).forEach((attachment) => {
      if (extrasByMessageId[attachment.messageId]) {
        extrasByMessageId[attachment.messageId].attachments.push(
          sails.helpers.chatMessageAttachments.presentOne(attachment),
        );
      }
    });

    reactions.filter(isExtraVisible).forEach((reaction) => {
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
        isExtraVisible(association) &&
        isExtraVisible(preview) &&
        preview.status === ChatLinkPreview.Statuses.READY &&
        extrasByMessageId[association.messageId]
      ) {
        extrasByMessageId[association.messageId].linkPreviews.push(preview);
      }
    });

    return extrasByMessageId;
  },
};
