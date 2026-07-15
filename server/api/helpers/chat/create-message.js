/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { extractMentionIds } = require('../../../utils/mentions');
const { reportChatError } = require('../../../utils/sentry');

module.exports = {
  inputs: {
    conversation: {
      type: 'ref',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    participantUserIds: {
      type: 'ref',
      required: true,
    },
    memberUserIds: {
      type: 'ref',
      required: true,
    },
    text: {
      type: 'string',
      defaultsTo: '',
    },
    clientMessageId: {
      type: 'string',
    },
    replyToMessageId: {
      type: 'string',
    },
    forwardedFromMessageId: {
      type: 'string',
    },
    forwardedFromUserId: {
      type: 'string',
    },
    user: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let wasCreated = false;
    const message = await sails.getDatastore().transaction(async (db) => {
      if (inputs.clientMessageId) {
        await sails
          .sendNativeQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [
            `chat-message:${inputs.conversation.id}:${inputs.user.id}:${inputs.clientMessageId}`,
          ])
          .usingConnection(db);

        const existingMessage = await ChatMessage.findOne({
          conversationId: inputs.conversation.id,
          userId: inputs.user.id,
          clientMessageId: inputs.clientMessageId,
        }).usingConnection(db);
        if (existingMessage) {
          return existingMessage;
        }
      }

      if (inputs.replyToMessageId) {
        const repliedMessage = await ChatMessage.findOne({
          id: inputs.replyToMessageId,
          conversationId: inputs.conversation.id,
        }).usingConnection(db);
        if (!repliedMessage) {
          throw 'replyMessageNotFound';
        }
      }

      const createdMessage = await ChatMessage.create({
        conversationId: inputs.conversation.id,
        userId: inputs.user.id,
        text: inputs.text,
        clientMessageId: inputs.clientMessageId,
        replyToMessageId: inputs.replyToMessageId,
        forwardedFromMessageId: inputs.forwardedFromMessageId,
        forwardedFromUserId: inputs.forwardedFromUserId,
      })
        .fetch()
        .usingConnection(db);

      await sails
        .sendNativeQuery(
          `UPDATE chat_conversation
           SET last_message_at = GREATEST(COALESCE(last_message_at, $2), $2), updated_at = $2
           WHERE id = $1`,
          [inputs.conversation.id, createdMessage.createdAt],
        )
        .usingConnection(db);

      wasCreated = true;
      return createdMessage;
    });

    if (!wasCreated) {
      return message;
    }

    const extras = await sails.helpers.chat.getMessageExtras([message.id]);
    const messageWithExtras = { ...message, ...extras[message.id] };
    const payload = {
      item: sails.helpers.chat.presentMessage(messageWithExtras),
      included: {
        users: [sails.helpers.users.presentOne(inputs.user, {})],
      },
    };

    sails.sockets.broadcast(
      `chatConversation:${inputs.conversation.id}`,
      'chatMessageCreate',
      payload,
      inputs.request,
    );

    const recipientUserIds =
      inputs.conversation.type === ChatConversation.Types.PROJECT_GROUP
        ? inputs.memberUserIds
        : inputs.participantUserIds;
    const uniqueRecipientUserIds = [...new Set(recipientUserIds)];
    const unreadCounts = await sails.helpers.chat.getUnreadCountsForUsers(
      inputs.conversation.id,
      uniqueRecipientUserIds,
    );
    const lastMessage = await ChatMessage.qm.getLastByConversationId(inputs.conversation.id);

    uniqueRecipientUserIds.forEach((userId) => {
      sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
        item: {
          id: inputs.conversation.id,
          lastMessageAt: lastMessage.createdAt,
          lastMessage: sails.helpers.chat.presentMessage(lastMessage),
          unreadCount: unreadCounts[userId] || 0,
        },
      });
    });

    const participantPreferences = await ChatParticipant.qm.getByConversationId(
      inputs.conversation.id,
    );
    const preferencesByUserId = new Map(
      participantPreferences.map((participant) => [participant.userId, participant]),
    );
    const mentionUserIds = new Set(extractMentionIds(inputs.text));
    uniqueRecipientUserIds.forEach((userId) => {
      if (userId === inputs.user.id) {
        return;
      }
      const preferences = preferencesByUserId.get(userId);
      const notificationLevel =
        (preferences && preferences.notificationLevel) || ChatParticipant.NotificationLevels.ALL;
      if (
        (preferences && ChatParticipant.isMuted(preferences)) ||
        (notificationLevel === ChatParticipant.NotificationLevels.MENTIONS &&
          !mentionUserIds.has(userId))
      ) {
        return;
      }
      sails.sockets.broadcast(`@user:${userId}`, 'chatMessageAlert', {
        item: {
          conversationId: inputs.conversation.id,
          messageId: message.id,
          projectId: inputs.project.id,
          senderUserId: inputs.user.id,
          hasMention: mentionUserIds.has(userId),
        },
      });
    });

    sails.helpers.chatLinkPreviews.syncMessageLinks
      .with({
        message,
        projectId: inputs.project.id,
      })
      .catch((error) => {
        sails.log.error('[CHAT_PREVIEW][SYNC_ERROR]', {
          messageId: message.id,
          error: error.message,
        });
        reportChatError(error, 'sync-link-previews');
      });

    return messageWithExtras;
  },
};
