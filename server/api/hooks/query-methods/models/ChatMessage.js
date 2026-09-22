/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getGreaterId, isIdAtOrBefore } = require('../../../../utils/id-helpers');

const DEFAULT_LIMIT = 50;

const createOne = (values) => ChatMessage.create({ ...values }).fetch();

const getByConversationId = (
  conversationId,
  { beforeId, afterId, minimumId, maximumId, editedBefore, limit = DEFAULT_LIMIT } = {},
) => {
  const criteria = { conversationId };
  if (editedBefore) {
    criteria.or = [{ editedAt: null }, { editedAt: { '<=': editedBefore } }];
  }
  const idCriteria = {};

  if (beforeId) {
    idCriteria['<'] = beforeId;
  } else if (afterId || minimumId) {
    idCriteria['>'] = getGreaterId(afterId, minimumId);
  }
  if (minimumId && !idCriteria['>']) {
    idCriteria['>'] = minimumId;
  }
  if (maximumId) {
    idCriteria['<='] = maximumId;
  }
  if (Object.keys(idCriteria).length > 0) {
    criteria.id = idCriteria;
  }

  return ChatMessage.find(criteria)
    .sort(afterId ? 'id ASC' : 'id DESC')
    .limit(limit);
};

const getWindowAroundId = async (
  conversationId,
  aroundId,
  minimumId,
  beforeLimit = 25,
  afterLimit = 25,
  maximumId = undefined,
  editedBefore = undefined,
) => {
  if (
    isIdAtOrBefore(aroundId, minimumId) ||
    (maximumId && isIdAtOrBefore(maximumId, aroundId) && String(maximumId) !== String(aroundId))
  ) {
    return null;
  }

  const visibleCriteria = editedBefore
    ? { or: [{ editedAt: null }, { editedAt: { '<=': editedBefore } }] }
    : {};
  const anchor = await ChatMessage.findOne({ id: aroundId, conversationId, ...visibleCriteria });
  if (!anchor) {
    return null;
  }

  const [before, after] = await Promise.all([
    ChatMessage.find({
      conversationId,
      ...visibleCriteria,
      id: {
        '<': aroundId,
        ...(minimumId && { '>': minimumId }),
        ...(maximumId && { '<=': maximumId }),
      },
    })
      .sort('id DESC')
      .limit(beforeLimit + 1),
    ChatMessage.find({
      conversationId,
      ...visibleCriteria,
      id: { '>': aroundId, ...(maximumId && { '<=': maximumId }) },
    })
      .sort('id ASC')
      .limit(afterLimit + 1),
  ]);

  return {
    messages: [...before.slice(0, beforeLimit).reverse(), anchor, ...after.slice(0, afterLimit)],
    hasMoreBefore: before.length > beforeLimit,
    hasMoreAfter: after.length > afterLimit,
  };
};

const getOneById = (id) => ChatMessage.findOne(id);

const getLastByConversationId = async (conversationId) => {
  const messages = await ChatMessage.find({ conversationId }).sort('id DESC').limit(1);
  return messages[0];
};

const getLastByConversationIds = async (conversationIds) => {
  if (conversationIds.length === 0) {
    return [];
  }

  const result = await sails.sendNativeQuery(
    `SELECT DISTINCT ON (conversation_id)
       id,
       conversation_id AS "conversationId",
       user_id AS "userId",
       client_message_id AS "clientMessageId",
       reply_to_message_id AS "replyToMessageId",
       forwarded_from_message_id AS "forwardedFromMessageId",
       forwarded_from_user_id AS "forwardedFromUserId",
       text,
       edited_at AS "editedAt",
       deleted_at AS "deletedAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM chat_message
     WHERE conversation_id = ANY($1::bigint[])
     ORDER BY conversation_id, id DESC`,
    [conversationIds],
  );

  return result.rows;
};

const getLastByConversationIdsForUser = async (conversationIds, userId) => {
  if (conversationIds.length === 0) {
    return [];
  }

  const result = await sails.sendNativeQuery(
    `SELECT DISTINCT ON (message.conversation_id)
       message.id,
       message.conversation_id AS "conversationId",
       message.user_id AS "userId",
       message.client_message_id AS "clientMessageId",
       message.reply_to_message_id AS "replyToMessageId",
       message.forwarded_from_message_id AS "forwardedFromMessageId",
       message.forwarded_from_user_id AS "forwardedFromUserId",
       message.text,
       message.edited_at AS "editedAt",
       message.deleted_at AS "deletedAt",
       message.created_at AS "createdAt",
       message.updated_at AS "updatedAt"
     FROM chat_message message
     JOIN chat_conversation conversation ON conversation.id = message.conversation_id
     LEFT JOIN chat_participant participant
       ON participant.conversation_id = message.conversation_id
      AND participant.user_id = $2
     WHERE message.conversation_id = ANY($1::bigint[])
       AND (conversation.type = 'projectGroup' OR participant.id IS NOT NULL)
       AND message.id > COALESCE(participant.history_cleared_through_message_id, 0)
       AND (
         participant.left_at IS NULL
         OR (
           participant.history_visible_through_message_id IS NOT NULL
           AND message.id <= participant.history_visible_through_message_id
           AND (message.edited_at IS NULL OR message.edited_at <= participant.left_at)
         )
       )
     ORDER BY message.conversation_id, message.id DESC`,
    [conversationIds, userId],
  );

  return result.rows;
};

const updateOne = (criteria, values) => ChatMessage.updateOne(criteria).set({ ...values });

const updateOneIfNotDeleted = (id, values) =>
  ChatMessage.updateOne({ id, deletedAt: null }).set({ ...values });

module.exports = {
  createOne,
  getByConversationId,
  getWindowAroundId,
  getOneById,
  getLastByConversationId,
  getLastByConversationIds,
  getLastByConversationIdsForUser,
  updateOne,
  updateOneIfNotDeleted,
};
