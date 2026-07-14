/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => ChatMessageReaction.find(criteria).sort('id');

const createOne = (values) => ChatMessageReaction.create({ ...values }).fetch();

const getByMessageIds = (messageIds) => defaultFind({ messageId: messageIds });

const getOneByMessageIdAndUserIdAndEmoji = (messageId, userId, emoji) =>
  ChatMessageReaction.findOne({ messageId, userId, emoji });

const deleteOne = (criteria) => ChatMessageReaction.destroyOne(criteria);

module.exports = {
  createOne,
  getByMessageIds,
  getOneByMessageIdAndUserIdAndEmoji,
  deleteOne,
};
