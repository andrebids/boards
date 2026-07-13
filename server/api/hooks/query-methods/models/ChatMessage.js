/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DEFAULT_LIMIT = 50;

const createOne = (values) => ChatMessage.create({ ...values }).fetch();

const getByConversationId = (conversationId, { beforeId, afterId, limit = DEFAULT_LIMIT } = {}) => {
  const criteria = { conversationId };

  if (beforeId) {
    criteria.id = { '<': beforeId };
  } else if (afterId) {
    criteria.id = { '>': afterId };
  }

  return ChatMessage.find(criteria)
    .sort(afterId ? 'id ASC' : 'id DESC')
    .limit(limit);
};

const getWindowAroundId = async (conversationId, aroundId, beforeLimit = 25, afterLimit = 25) => {
  const anchor = await ChatMessage.findOne({ id: aroundId, conversationId });
  if (!anchor) {
    return null;
  }

  const [before, after] = await Promise.all([
    ChatMessage.find({ conversationId, id: { '<': aroundId } })
      .sort('id DESC')
      .limit(beforeLimit + 1),
    ChatMessage.find({ conversationId, id: { '>': aroundId } })
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
  updateOne,
  updateOneIfNotDeleted,
};
