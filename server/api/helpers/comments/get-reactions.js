/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    commentIds: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    if (inputs.commentIds.length === 0) {
      return {};
    }

    const reactions = await CommentReaction.find({
      commentId: inputs.commentIds,
    }).sort('id');
    const reactionsByCommentId = Object.fromEntries(
      inputs.commentIds.map((commentId) => [commentId, []]),
    );
    const groupedReactions = new Map();

    reactions.forEach((reaction) => {
      const key = `${reaction.commentId}\u0000${reaction.emoji}`;
      let groupedReaction = groupedReactions.get(key);

      if (!groupedReaction) {
        groupedReaction = { emoji: reaction.emoji, userIds: [] };
        groupedReactions.set(key, groupedReaction);
        if (reactionsByCommentId[reaction.commentId]) {
          reactionsByCommentId[reaction.commentId].push(groupedReaction);
        }
      }

      groupedReaction.userIds.push(reaction.userId);
    });

    return reactionsByCommentId;
  },
};
