/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { buildEmail } = require('../../../utils/chat-email-notifications');

const PROCESSING_STALE_AFTER_MINUTES = 15;
const MAX_ERROR_LENGTH = 2000;

const truncateError = (error) =>
  String(error && (error.stack || error.message || error)).slice(0, MAX_ERROR_LENGTH);

const claimNextBatch = () =>
  sails.getDatastore().transaction(async (db) => {
    const dueResult = await sails
      .sendNativeQuery(
        `SELECT user_id, conversation_id
         FROM chat_email_notification
         WHERE status = 'pending'
           AND scheduled_at <= NOW()
         ORDER BY scheduled_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
      )
      .usingConnection(db);
    if (dueResult.rowCount === 0) {
      return [];
    }

    const { user_id: userId, conversation_id: conversationId } = dueResult.rows[0];
    const lockResult = await sails
      .sendNativeQuery(
        `SELECT pg_try_advisory_xact_lock(
           hashtextextended($1::text || ':' || $2::text, 0)
         ) AS acquired`,
        [userId, conversationId],
      )
      .usingConnection(db);
    if (!lockResult.rows[0].acquired) {
      return [];
    }

    const claimedResult = await sails
      .sendNativeQuery(
        `UPDATE chat_email_notification
         SET status = 'processing',
             attempts = attempts + 1,
             updated_at = NOW()
         WHERE user_id = $1
           AND conversation_id = $2
           AND status = 'pending'
         RETURNING
           id,
           message_id AS "messageId",
           conversation_id AS "conversationId",
           user_id AS "userId",
           kind,
           attempts`,
        [userId, conversationId],
      )
      .usingConnection(db);

    return claimedResult.rows;
  });

const updateRows = async (ids, assignments, values = []) => {
  if (ids.length === 0) {
    return;
  }

  await sails.sendNativeQuery(
    `UPDATE chat_email_notification
     SET ${assignments}, updated_at = NOW()
     WHERE id = ANY($1::bigint[])`,
    [ids, ...values],
  );
};

const markSkipped = (ids, reason) =>
  updateRows(ids, `status = 'skipped', last_error = $2`, [reason]);

const markSent = (ids, messageId) =>
  updateRows(ids, `status = 'sent', email_message_id = $2, sent_at = NOW(), last_error = NULL`, [
    messageId,
  ]);

const requeueOrFail = (rows, error, maxAttempts) => {
  const failure = truncateError(error);
  const failedRows = rows.filter(({ attempts }) => attempts >= maxAttempts);
  const retryRows = rows.filter(({ attempts }) => attempts < maxAttempts);
  const updates = [];

  if (failedRows.length > 0) {
    updates.push(
      updateRows(
        failedRows.map(({ id }) => id),
        `status = 'failed', last_error = $2`,
        [failure],
      ),
    );
  }
  if (retryRows.length > 0) {
    const attempt = Math.max(...retryRows.map(({ attempts }) => attempts));
    const retryDelaySeconds = Math.min(60 * 60, 60 * 2 ** attempt);
    updates.push(
      updateRows(
        retryRows.map(({ id }) => id),
        `status = 'pending',
         scheduled_at = NOW() + ($2 * INTERVAL '1 second'),
         last_error = $3`,
        [retryDelaySeconds, failure],
      ),
    );
  }

  return Promise.all(updates);
};

const recoverStaleRows = () =>
  sails.sendNativeQuery(
    `UPDATE chat_email_notification
     SET status = 'pending',
         scheduled_at = LEAST(scheduled_at, NOW()),
         last_error = COALESCE(last_error, 'Recovered after interrupted processing'),
         updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - ($1 * INTERVAL '1 minute')`,
    [PROCESSING_STALE_AFTER_MINUTES],
  );

const isMessageRead = (participant, messageId) =>
  Boolean(
    participant.lastReadMessageId && BigInt(participant.lastReadMessageId) >= BigInt(messageId),
  );

const loadBatchContext = async (rows) => {
  const [{ conversationId, userId }] = rows;
  const [conversation, recipient, participant] = await Promise.all([
    ChatConversation.qm.getOneById(conversationId),
    User.qm.getOneById(userId, { withDeactivated: true }),
    ChatParticipant.qm.getOneByConversationIdAndUserId(conversationId, userId),
  ]);
  if (!conversation) {
    return { reason: 'Conversation no longer exists' };
  }
  if (!recipient || recipient.isDeactivated || !recipient.email) {
    return { reason: 'Recipient is missing, deactivated, or has no email' };
  }
  if (!participant && conversation.type !== ChatConversation.Types.PROJECT_GROUP) {
    return { reason: 'Recipient is no longer a conversation participant' };
  }
  if (participant && ChatParticipant.isMuted(participant)) {
    return { reason: 'Conversation notifications are muted for the recipient' };
  }

  const project = await Project.qm.getOneById(conversation.projectId);
  if (!project) {
    return { reason: 'Project no longer exists' };
  }

  const authorizedUserIds = await sails.helpers.chat.getConversationRecipientUserIds(conversation);
  if (!authorizedUserIds.includes(userId)) {
    return { reason: 'Recipient no longer has access to the conversation' };
  }

  const messages = await ChatMessage.find({
    id: rows.map(({ messageId }) => messageId),
  }).sort('id ASC');
  const messageById = new Map(messages.map((message) => [String(message.id), message]));
  const senderUserIds = [
    ...new Set(messages.map(({ userId: senderUserId }) => senderUserId).filter(Boolean)),
  ];
  const senders = senderUserIds.length > 0 ? await User.qm.getByIds(senderUserIds) : [];
  const senderById = new Map(senders.map((sender) => [String(sender.id), sender]));

  const eligibleRows = [];
  const skippedRows = [];
  rows.forEach((row) => {
    const message = messageById.get(String(row.messageId));
    if (
      !message ||
      message.deletedAt ||
      (participant && isMessageRead(participant, row.messageId)) ||
      (participant &&
        participant.notificationLevel === ChatParticipant.NotificationLevels.MENTIONS &&
        row.kind !== 'mention')
    ) {
      skippedRows.push(row);
      return;
    }

    const sender = senderById.get(String(message.userId));
    if (!sender) {
      skippedRows.push(row);
      return;
    }

    eligibleRows.push({
      ...row,
      message: {
        ...message,
        kind: row.kind,
        sender,
      },
    });
  });

  return {
    conversation,
    eligibleRows,
    project,
    recipient,
    skippedRows,
  };
};

module.exports = {
  inputs: {
    maxBatches: {
      type: 'number',
      required: true,
    },
  },

  async fn(inputs) {
    const result = {
      batches: 0,
      failed: 0,
      sent: 0,
      skipped: 0,
    };

    if (!sails.config.custom.chatEmailNotificationsEnabled || !sails.hooks.smtp.isEnabled()) {
      return result;
    }

    await recoverStaleRows();

    // Batches are intentionally sequential: claiming and sending in parallel could
    // produce two digests for the same recipient and conversation.
    /* eslint-disable no-await-in-loop, no-continue */
    for (let index = 0; index < inputs.maxBatches; index += 1) {
      const rows = await claimNextBatch();
      if (rows.length === 0) {
        break;
      }

      result.batches += 1;
      let retryRows = rows;
      try {
        const context = await loadBatchContext(rows);
        if (context.reason) {
          await markSkipped(
            rows.map(({ id }) => id),
            context.reason,
          );
          result.skipped += rows.length;
          continue;
        }

        if (context.skippedRows.length > 0) {
          await markSkipped(
            context.skippedRows.map(({ id }) => id),
            'Message was read, deleted, missing, or filtered by notification preferences',
          );
          result.skipped += context.skippedRows.length;
        }
        retryRows = context.eligibleRows;
        if (context.eligibleRows.length === 0) {
          continue;
        }

        const email = buildEmail({
          baseUrl: sails.config.custom.baseUrl,
          conversation: context.conversation,
          messages: context.eligibleRows.map(({ message }) => message),
          project: context.project,
          recipient: context.recipient,
        });
        const html = await sails.helpers.utils.compileEmailTemplate.with({
          templateName: 'chat-notification',
          data: email.templateData,
        });
        const deterministicMessageId = `<boards-chat-${context.recipient.id}-${context.conversation.id}-${context.eligibleRows[0].id}@boards.dsproject.pt>`;
        const info = await sails.helpers.utils.sendEmail.with({
          to: context.recipient.email,
          subject: email.subject,
          text: email.text,
          html,
          messageId: deterministicMessageId,
        });

        await markSent(
          context.eligibleRows.map(({ id }) => id),
          info.messageId || deterministicMessageId,
        );
        result.sent += context.eligibleRows.length;
        sails.log.info('[CHAT_EMAIL_NOTIFICATION][SENT]', {
          conversationId: context.conversation.id,
          messageCount: context.eligibleRows.length,
          messageId: info.messageId || deterministicMessageId,
          userId: context.recipient.id,
        });
      } catch (error) {
        if (retryRows.length > 0) {
          await requeueOrFail(
            retryRows,
            error,
            sails.config.custom.chatEmailNotificationMaxAttempts,
          );
          result.failed += retryRows.length;
        }
        sails.log.error('[CHAT_EMAIL_NOTIFICATION][ERROR]', {
          conversationId: rows[0].conversationId,
          error: truncateError(error),
          userId: rows[0].userId,
        });
      }
    }
    /* eslint-enable no-await-in-loop, no-continue */

    return result;
  },
};
