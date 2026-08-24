/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const toggleReaction = require('../../api/controllers/comment-reactions/toggle');
const getReactions = require('../../api/helpers/comments/get-reactions');

describe('Comment reactions', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      BoardMembership: global.BoardMembership,
      CommentReaction: global.CommentReaction,
      Notification: global.Notification,
      sails: global.sails,
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
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

  it('notifies the comment author only when another user adds a reaction', async () => {
    const createdNotifications = [];
    let existingReaction;
    const comment = {
      id: 'comment-1',
      cardId: 'card-1',
      userId: 'author',
      text: 'The original comment',
    };
    const card = { id: 'card-1', boardId: 'board-1', name: 'Card' };

    global._ = lodash;
    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: {
        getOneByBoardIdAndUserId: async () => ({ role: 'editor' }),
      },
    };
    global.CommentReaction = {
      findOne: () => ({
        usingConnection: async () => existingReaction,
      }),
      create: (values) => ({
        usingConnection: async () => {
          existingReaction = { id: 'reaction-1', ...values };
        },
      }),
      destroyOne: () => ({
        usingConnection: async () => {
          existingReaction = undefined;
        },
      }),
    };
    global.Notification = {
      Types: { REACT_TO_COMMENT: 'reactToComment' },
    };
    global.sails = {
      getDatastore: () => ({
        transaction: async (callback) => callback({}),
      }),
      sendNativeQuery: () => ({
        usingConnection: async () => ({ rows: [{ id: comment.id }] }),
      }),
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        comments: {
          getPathToProjectById: () => ({
            intercept: async () => ({
              comment,
              card,
              list: { id: 'list-1' },
              board: { id: 'board-1' },
              project: { id: 'project-1' },
            }),
          }),
          getReactions: {
            with: async () => ({ [comment.id]: [{ emoji: '👍', userIds: ['reactor'] }] }),
          },
        },
        notifications: {
          createOne: {
            with: async (inputs) => {
              createdNotifications.push(inputs);
            },
          },
        },
      },
    };

    await toggleReaction.fn.call(
      { req: { currentUser: { id: 'reactor', name: 'Reactor' } } },
      { commentId: comment.id, emoji: '👍' },
    );

    await toggleReaction.fn.call(
      { req: { currentUser: { id: 'reactor', name: 'Reactor' } } },
      { commentId: comment.id, emoji: '👍' },
    );

    await toggleReaction.fn.call(
      { req: { currentUser: { id: comment.userId, name: 'Author' } } },
      { commentId: comment.id, emoji: '👍' },
    );

    expect(createdNotifications).to.deep.equal([
      {
        values: {
          userId: comment.userId,
          comment,
          type: 'reactToComment',
          data: {
            emoji: '👍',
          },
          creatorUser: { id: 'reactor', name: 'Reactor' },
          card,
        },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        list: { id: 'list-1' },
      },
    ]);
  });
});
