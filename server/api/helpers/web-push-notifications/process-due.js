/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { buildPayload, classifyWebPushError } = require('../../../utils/web-push-notifications');

const CLAIM_BATCH_SIZE = 25;
const DELIVERY_CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const MAX_JOB_AGE_MINUTES = 10;
const PROCESSING_STALE_AFTER_MINUTES = 2;
const MAX_ERROR_LENGTH = 300;

const errorSummary = (error) => {
  const code = error && (error.code || error.name);
  const statusCode = Number(error && error.statusCode);
  return String(statusCode || code || 'WEB_PUSH_ERROR').slice(0, MAX_ERROR_LENGTH);
};

const mapWithConcurrency = async (items, concurrency, callback) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      // eslint-disable-next-line no-await-in-loop
      results[index] = await callback(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
};

const recoverStaleRows = () =>
  sails.sendNativeQuery(
    `UPDATE web_push_notification
     SET status = 'pending',
         scheduled_at = LEAST(scheduled_at, NOW()),
         last_error = COALESCE(last_error, 'INTERRUPTED_PROCESSING'),
         updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - ($1 * INTERVAL '1 minute')`,
    [PROCESSING_STALE_AFTER_MINUTES],
  );

const claimNextBatch = () =>
  sails.getDatastore().transaction(async (db) => {
    const claimedResult = await sails
      .sendNativeQuery(
        `WITH due AS (
           SELECT id
           FROM web_push_notification
           WHERE status = 'pending'
             AND scheduled_at <= NOW()
           ORDER BY scheduled_at, id
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE web_push_notification notification
         SET status = 'processing',
             attempts = attempts + 1,
             updated_at = NOW()
         FROM due
         WHERE notification.id = due.id
         RETURNING
           notification.id,
           notification.message_id AS "messageId",
           notification.conversation_id AS "conversationId",
           notification.user_id AS "userId",
           notification.kind,
           notification.attempts,
           notification.created_at AS "createdAt"`,
        [CLAIM_BATCH_SIZE],
      )
      .usingConnection(db);
    return claimedResult.rows;
  });

const updateRow = (id, assignments, values = []) =>
  sails.sendNativeQuery(
    `UPDATE web_push_notification
     SET ${assignments}, updated_at = NOW()
     WHERE id = $1`,
    [id, ...values],
  );

const markSkipped = (id, reason) => updateRow(id, `status = 'skipped', last_error = $2`, [reason]);

const markSent = (id) => updateRow(id, `status = 'sent', sent_at = NOW(), last_error = NULL`);

const markFailed = (id, reason) => updateRow(id, `status = 'failed', last_error = $2`, [reason]);

const requeue = (row, reason) => {
  const retryDelaySeconds = Math.min(120, 15 * 2 ** Math.max(0, row.attempts - 1));
  return updateRow(
    row.id,
    `status = 'pending',
     scheduled_at = NOW() + ($2 * INTERVAL '1 second'),
     last_error = $3`,
    [retryDelaySeconds, reason],
  );
};

const isExpired = (row) =>
  Date.now() - new Date(row.createdAt).getTime() >= MAX_JOB_AGE_MINUTES * 60 * 1000;

const isMessageRead = (participant, messageId) =>
  Boolean(
    participant.lastReadMessageId && BigInt(participant.lastReadMessageId) >= BigInt(messageId),
  );

const getTranslator = (language) => {
  const makeTranslator = sails.helpers && sails.helpers.utils && sails.helpers.utils.makeTranslator;
  return typeof makeTranslator === 'function' ? makeTranslator(language) : undefined;
};

const loadSubscriptions = async (userIds) => {
  const result = await sails.sendNativeQuery(
    `SELECT
       id,
       user_id AS "userId",
       endpoint,
       p256dh,
       auth
     FROM web_push_subscription
     WHERE user_id = ANY($1::bigint[])
       AND (expiration_time IS NULL OR expiration_time > EXTRACT(EPOCH FROM NOW()) * 1000)
     ORDER BY id`,
    [userIds],
  );

  const subscriptionsByUserId = new Map();
  result.rows.forEach((subscription) => {
    const key = String(subscription.userId);
    const subscriptions = subscriptionsByUserId.get(key) || [];
    subscriptions.push(subscription);
    subscriptionsByUserId.set(key, subscriptions);
  });
  return subscriptionsByUserId;
};

const loadContext = async (row) => {
  const [conversation, message, recipient, participant] = await Promise.all([
    ChatConversation.qm.getOneById(row.conversationId),
    ChatMessage.qm.getOneById(row.messageId),
    User.qm.getOneById(row.userId, { withDeactivated: true }),
    ChatParticipant.qm.getOneByConversationIdAndUserId(row.conversationId, row.userId),
  ]);

  if (!conversation || !message || message.deletedAt) {
    return { reason: 'MESSAGE_MISSING_OR_DELETED' };
  }
  if (String(message.userId) === String(row.userId)) {
    return { reason: 'SENDER_IS_RECIPIENT' };
  }
  if (!recipient || recipient.isDeactivated) {
    return { reason: 'RECIPIENT_INACTIVE' };
  }
  if (recipient.notificationLevel === User.NotificationLevels.NONE) {
    return { reason: 'USER_NOTIFICATIONS_DISABLED' };
  }
  if (recipient.notificationLevel === User.NotificationLevels.ESSENTIAL && row.kind === 'general') {
    return { reason: 'USER_ESSENTIAL_ONLY' };
  }
  if (!participant && conversation.type !== ChatConversation.Types.PROJECT_GROUP) {
    return { reason: 'RECIPIENT_NOT_PARTICIPANT' };
  }
  if (participant && ChatParticipant.isMuted(participant)) {
    return { reason: 'CONVERSATION_MUTED' };
  }
  if (
    participant &&
    participant.notificationLevel === ChatParticipant.NotificationLevels.MENTIONS &&
    row.kind !== 'mention'
  ) {
    return { reason: 'CONVERSATION_MENTIONS_ONLY' };
  }
  if (participant && isMessageRead(participant, row.messageId)) {
    return { reason: 'MESSAGE_ALREADY_READ' };
  }

  const authorizedUserIds = await sails.helpers.chat.getConversationRecipientUserIds(conversation);
  if (!authorizedUserIds.some((userId) => String(userId) === String(row.userId))) {
    return { reason: 'ACCESS_REVOKED' };
  }

  const project = await Project.qm.getOneById(conversation.projectId);
  if (!project) {
    return { reason: 'PROJECT_MISSING' };
  }

  let hasAttachment = false;
  if (!message.text) {
    hasAttachment = (await ChatMessageAttachment.count({ messageId: message.id })) > 0;
    if (!hasAttachment) {
      return { reason: 'ATTACHMENT_NOT_PERSISTED' };
    }
  }

  const sender = await User.qm.getOneById(message.userId, {
    withDeactivated: true,
  });
  if (!sender) {
    return { reason: 'SENDER_MISSING' };
  }

  return {
    payload: buildPayload({
      conversation,
      hasAttachment,
      message,
      project,
      recipient,
      sender,
      translate: getTranslator(recipient.language),
    }),
  };
};

const deliverRow = async (row, subscriptions) => {
  const startedAt = Date.now();
  if (isExpired(row)) {
    await markSkipped(row.id, 'JOB_EXPIRED');
    return { state: 'skipped' };
  }
  const context = await loadContext(row);
  if (context.reason) {
    await markSkipped(row.id, context.reason);
    return { state: 'skipped' };
  }
  if (subscriptions.length === 0) {
    await markSkipped(row.id, 'NO_ACTIVE_SUBSCRIPTIONS');
    return { state: 'skipped' };
  }

  const deliveryResults = await mapWithConcurrency(
    subscriptions,
    DELIVERY_CONCURRENCY,
    async (subscription) => {
      try {
        await sails.helpers.webPushNotifications.sendOne.with({
          subscription,
          payload: context.payload,
        });
        return { state: 'sent', subscriptionId: subscription.id };
      } catch (error) {
        return {
          state: classifyWebPushError(error),
          statusCode: Number(error && error.statusCode) || null,
          subscriptionId: subscription.id,
          error: errorSummary(error),
        };
      }
    },
  );

  const expiredSubscriptionIds = deliveryResults
    .filter(({ state }) => state === 'expired')
    .map(({ subscriptionId }) => subscriptionId);
  if (expiredSubscriptionIds.length > 0) {
    await sails.sendNativeQuery(
      `DELETE FROM web_push_subscription
       WHERE id = ANY($1::bigint[])
         AND user_id = $2`,
      [expiredSubscriptionIds, row.userId],
    );
  }

  const successfulCount = deliveryResults.filter(({ state }) => state === 'sent').length;
  const retryable = deliveryResults.find(({ state }) => state === 'retry');
  const permanent = deliveryResults.find(({ state }) => state === 'permanent');
  if (successfulCount > 0) {
    await markSent(row.id);
    if (successfulCount !== subscriptions.length) {
      sails.log.warn('[WEB_PUSH_NOTIFICATION][PARTIAL]', {
        notificationId: row.id,
        messageId: row.messageId,
        userId: row.userId,
        successfulCount,
        failedCount: subscriptions.length - successfulCount,
        attempt: row.attempts,
        durationMs: Date.now() - startedAt,
      });
    }
    sails.log.info('[WEB_PUSH_NOTIFICATION][SENT]', {
      notificationId: row.id,
      messageId: row.messageId,
      userId: row.userId,
      subscriptionCount: subscriptions.length,
      successfulCount,
      attempt: row.attempts,
      durationMs: Date.now() - startedAt,
    });
    return { state: 'sent' };
  }

  if (expiredSubscriptionIds.length === deliveryResults.length) {
    await markSkipped(row.id, 'EXPIRED_SUBSCRIPTIONS_REMOVED');
    return { state: 'skipped' };
  }

  if (retryable && row.attempts < MAX_ATTEMPTS && !isExpired(row)) {
    await requeue(row, retryable.error);
    sails.log.warn('[WEB_PUSH_NOTIFICATION][RETRY]', {
      notificationId: row.id,
      messageId: row.messageId,
      userId: row.userId,
      statusCode: retryable.statusCode,
      attempt: row.attempts,
      durationMs: Date.now() - startedAt,
    });
    return { state: 'retried' };
  }

  const failure = permanent || retryable;
  await markFailed(row.id, failure ? failure.error : 'NO_DELIVERABLE_SUBSCRIPTIONS');
  sails.log.error('[WEB_PUSH_NOTIFICATION][FAILED]', {
    notificationId: row.id,
    messageId: row.messageId,
    userId: row.userId,
    statusCode: failure && failure.statusCode,
    attempt: row.attempts,
    durationMs: Date.now() - startedAt,
  });
  return { state: 'failed' };
};

module.exports = {
  inputs: {},

  async fn() {
    const result = { claimed: 0, failed: 0, retried: 0, sent: 0, skipped: 0 };
    if (!sails.config.custom.webPush || !sails.config.custom.webPush.enabled) {
      return result;
    }

    await recoverStaleRows();
    const rows = await claimNextBatch();
    result.claimed = rows.length;
    if (rows.length === 0) {
      return result;
    }

    const subscriptionsByUserId = await loadSubscriptions([
      ...new Set(rows.map(({ userId }) => userId)),
    ]);
    const outcomes = await mapWithConcurrency(rows, DELIVERY_CONCURRENCY, (row) =>
      deliverRow(row, subscriptionsByUserId.get(String(row.userId)) || []),
    );
    outcomes.forEach(({ state }) => {
      if (state === 'retried') {
        result.retried += 1;
      } else if (Object.prototype.hasOwnProperty.call(result, state)) {
        result[state] += 1;
      }
    });
    return result;
  },
};
