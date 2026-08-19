/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');

const getReactions = require('../../api/helpers/comments/get-reactions');

describe('Comment reactions', () => {
  let previousCommentReaction;

  beforeEach(() => {
    previousCommentReaction = global.CommentReaction;
  });

  afterEach(() => {
    if (previousCommentReaction === undefined) {
      delete global.CommentReaction;
    } else {
      global.CommentReaction = previousCommentReaction;
    }
  });

  it('groups reactions by comment and emoji', async () => {
    global.CommentReaction = {
      find: () => ({
        sort: async () => [
          { id: '10', commentId: '1', emoji: '👍', userId: '3' },
          { id: '11', commentId: '1', emoji: '👍', userId: '4' },
          { id: '12', commentId: '1', emoji: '❤️', userId: '3' },
          { id: '13', commentId: '2', emoji: '🎉', userId: '4' },
        ],
      }),
    };

    const reactionsByCommentId = await getReactions.fn({
      commentIds: ['1', '2'],
    });

    expect(reactionsByCommentId).to.deep.equal({
      1: [
        { emoji: '👍', userIds: ['3', '4'] },
        { emoji: '❤️', userIds: ['3'] },
      ],
      2: [{ emoji: '🎉', userIds: ['4'] }],
    });
  });

  it('does not query when there are no comments', async () => {
    global.CommentReaction = {
      find: () => {
        throw new Error('Unexpected query');
      },
    };

    expect(await getReactions.fn({ commentIds: [] })).to.deep.equal({});
  });
});
