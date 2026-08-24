/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  COMMENT_NOT_FOUND: { commentNotFound: 'Comment not found' },
};

module.exports = {
  inputs: {
    commentId: {
      ...idInput,
      required: true,
    },
    emoji: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 32,
    },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    commentNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const { comment, card, list, board, project } = await sails.helpers.comments
      .getPathToProjectById(inputs.commentId)
      .intercept('pathNotFound', () => Errors.COMMENT_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.COMMENT_NOT_FOUND;
    }
    if (boardMembership.role !== BoardMembership.Roles.EDITOR && !boardMembership.canComment) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const reactionResult = await sails.getDatastore().transaction(async (db) => {
      const lockResult = await sails
        .sendNativeQuery('SELECT id FROM comment WHERE id = $1 FOR UPDATE', [comment.id])
        .usingConnection(db);

      if (lockResult.rows.length === 0) {
        return { commentExists: false, reactionAdded: false };
      }

      const existing = await CommentReaction.findOne({
        commentId: comment.id,
        userId: currentUser.id,
        emoji: inputs.emoji,
      }).usingConnection(db);

      if (existing) {
        await CommentReaction.destroyOne(existing.id).usingConnection(db);
        return { commentExists: true, reactionAdded: false };
      }

      await CommentReaction.create({
        commentId: comment.id,
        userId: currentUser.id,
        emoji: inputs.emoji,
      }).usingConnection(db);
      return { commentExists: true, reactionAdded: true };
    });

    if (!reactionResult.commentExists) {
      throw Errors.COMMENT_NOT_FOUND;
    }

    if (reactionResult.reactionAdded && comment.userId !== currentUser.id) {
      await sails.helpers.notifications.createOne.with({
        values: {
          userId: comment.userId,
          comment,
          type: Notification.Types.REACT_TO_COMMENT,
          data: {
            emoji: inputs.emoji,
          },
          creatorUser: currentUser,
          card,
        },
        project,
        board,
        list,
      });
    }

    const reactionsByCommentId = await sails.helpers.comments.getReactions.with({
      commentIds: [comment.id],
    });
    const item = {
      ...comment,
      reactions: reactionsByCommentId[comment.id],
    };

    sails.sockets.broadcast(`board:${board.id}`, 'commentUpdate', { item }, this.req);

    return { item };
  },
};
