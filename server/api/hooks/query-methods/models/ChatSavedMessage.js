/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const getByUserId = (userId, { beforeId, limit = 50 } = {}) => {
  const criteria = { userId };
  if (beforeId) {
    criteria.id = { '<': beforeId };
  }
  return ChatSavedMessage.find(criteria).sort('id DESC').limit(limit);
};

const getByUserIdAndProjectId = async (userId, projectId, { beforeId, limit = 50 } = {}) => {
  const values = [userId, projectId, limit];
  const beforeClause = beforeId ? 'AND saved.id < $4' : '';
  if (beforeId) {
    values.push(beforeId);
  }

  const result = await sails.sendNativeQuery(
    `SELECT saved.id,
            saved.user_id AS "userId",
            saved.message_id AS "messageId",
            saved.created_at AS "createdAt",
            saved.updated_at AS "updatedAt"
     FROM chat_saved_message AS saved
     JOIN chat_message AS message ON message.id = saved.message_id
     JOIN chat_conversation AS conversation ON conversation.id = message.conversation_id
     WHERE saved.user_id = $1
       AND conversation.project_id = $2
       AND message.deleted_at IS NULL
       ${beforeClause}
     ORDER BY saved.id DESC
     LIMIT $3`,
    values,
  );
  return result.rows;
};

const getByUserIdAndMessageIds = (userId, messageIds) =>
  messageIds.length > 0 ? ChatSavedMessage.find({ userId, messageId: messageIds }) : [];

const getOneByUserIdAndMessageId = (userId, messageId) =>
  ChatSavedMessage.findOne({ userId, messageId });

const createOne = (values) => ChatSavedMessage.create({ ...values }).fetch();

const deleteOne = (criteria) => ChatSavedMessage.destroyOne(criteria);

module.exports = {
  getByUserId,
  getByUserIdAndProjectId,
  getByUserIdAndMessageIds,
  getOneByUserIdAndMessageId,
  createOne,
  deleteOne,
};
