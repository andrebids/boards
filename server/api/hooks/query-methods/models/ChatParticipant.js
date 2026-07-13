/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => ChatParticipant.find(criteria).sort('id');

const createOne = (values) => ChatParticipant.create({ ...values }).fetch();

const getByConversationId = (conversationId) => defaultFind({ conversationId });

const getByConversationIds = (conversationIds) => defaultFind({ conversationId: conversationIds });

const getByUserId = (userId) => defaultFind({ userId });

const getOneByConversationIdAndUserId = (conversationId, userId) =>
  ChatParticipant.findOne({ conversationId, userId });

const updateOne = (criteria, values) => ChatParticipant.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => ChatParticipant.destroyOne(criteria);

const advanceReadCursor = async (id, messageId, lastReadAt) => {
  await sails.sendNativeQuery(
    `UPDATE chat_participant
     SET last_read_message_id = $2, last_read_at = $3, updated_at = $3
     WHERE id = $1
       AND $2 > COALESCE(last_read_message_id, 0)`,
    [id, messageId, lastReadAt],
  );

  return ChatParticipant.findOne(id);
};

module.exports = {
  createOne,
  getByConversationId,
  getByConversationIds,
  getByUserId,
  getOneByConversationIdAndUserId,
  updateOne,
  deleteOne,
  advanceReadCursor,
};
