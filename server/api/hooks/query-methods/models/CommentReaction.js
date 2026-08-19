/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => CommentReaction.find(criteria).sort('id');

const createOne = (values) => CommentReaction.create({ ...values }).fetch();

const getByCommentIds = (commentIds) => defaultFind({ commentId: commentIds });

const getOneByCommentIdAndUserIdAndEmoji = (commentId, userId, emoji) =>
  CommentReaction.findOne({ commentId, userId, emoji });

const deleteOne = (criteria) => CommentReaction.destroyOne(criteria);

module.exports = {
  createOne,
  getByCommentIds,
  getOneByCommentIdAndUserIdAndEmoji,
  deleteOne,
};
