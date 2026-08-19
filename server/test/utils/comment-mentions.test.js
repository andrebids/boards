/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const createComment = require('../../api/helpers/comments/create-one');
const getNewMentionUserIds = require('../../api/helpers/comments/get-new-mention-user-ids');
const updateComment = require('../../api/helpers/comments/update-one');
const createNotification = require('../../api/helpers/notifications/create-one');

describe('Comment mentions', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      sails: global.sails,
      CardSubscription: global.CardSubscription,
      Comment: global.Comment,
      Notification: global.Notification,
      NotificationService: global.NotificationService,
      User: global.User,
    };

    global._ = lodash;
    global.Notification = {
      Types: {
        ADD_MEMBER_TO_CARD: 'addMemberToCard',
        COMMENT_CARD: 'commentCard',
        MENTION_IN_COMMENT: 'mentionInComment',
        SET_DUE_DATE: 'setDueDate',
      },
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

  it('keeps mentioned board members even when they are not card members or subscribers', async () => {
    global.sails = {
      helpers: {
        boards: {
          getMemberUserIds: async () => ['author', 'mentioned'],
        },
      },
    };

    const userIds = await getNewMentionUserIds.fn({
      text:
        'Hello @[Mentioned](mentioned), @[Mentioned again](mentioned), ' +
        '@[Author](author), and @[Outside](outside)',
      previousText: '',
      boardId: 'board-1',
      exceptUserIdOrIds: 'author',
    });

    expect(userIds).to.deep.equal(['mentioned']);
  });

  it('returns only mentions added by an edit', async () => {
    global.sails = {
      helpers: {
        boards: {
          getMemberUserIds: async () => ['existing', 'new-user'],
        },
      },
    };

    const userIds = await getNewMentionUserIds.fn({
      text: 'Hello @[Existing](existing) and @[New](new-user)',
      previousText: 'Hello @[Existing](existing)',
      boardId: 'board-1',
      exceptUserIdOrIds: 'author',
    });

    expect(userIds).to.deep.equal(['new-user']);
  });

  it('creates a mention notification when a new comment mentions a non-card member', async () => {
    const createdNotifications = [];
    let mentionInputs;
    const comment = {
      id: 'comment-1',
      cardId: 'card-1',
      userId: 'author',
      text: 'Hello @[Mentioned](mentioned)',
    };

    global.Comment = {
      qm: {
        createOne: async () => comment,
      },
    };
    global.sails = {
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        activities: {
          createCommentActivity: {
            with: async () => ({ id: 'activity-1' }),
          },
        },
        boards: {
          getSubscriptionUserIds: async () => [],
        },
        cards: {
          getSubscriptionUserIds: async () => [],
        },
        comments: {
          getNewMentionUserIds: {
            with: async (inputs) => {
              mentionInputs = inputs;
              return ['mentioned'];
            },
          },
        },
        notifications: {
          createOne: {
            with: async (inputs) => {
              createdNotifications.push(inputs);
            },
          },
        },
        users: {
          presentOne: (user) => user,
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
    };

    await createComment.fn({
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      values: {
        text: comment.text,
        card: { id: 'card-1', boardId: 'board-1', name: 'Card' },
        user: {
          id: 'author',
          name: 'Author',
          subscribeToCardWhenCommenting: false,
        },
      },
    });

    expect(mentionInputs).to.deep.equal({
      text: comment.text,
      boardId: 'board-1',
      exceptUserIdOrIds: 'author',
    });
    expect(createdNotifications).to.have.lengthOf(1);
    expect(createdNotifications[0].values).to.include({
      userId: 'mentioned',
      type: 'mentionInComment',
    });
  });

  it('notifies only newly mentioned users when a comment is edited', async () => {
    const createdNotifications = [];
    let mentionInputs;
    const previousComment = {
      id: 'comment-1',
      text: 'Hello @[Existing](existing)',
    };
    const updatedComment = {
      ...previousComment,
      text: 'Hello @[Existing](existing) and @[New](new-user)',
    };

    global.Comment = {
      qm: {
        updateOne: async () => updatedComment,
      },
    };
    global.sails = {
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        activities: {
          createCommentActivity: {
            with: async () => ({ id: 'activity-1' }),
          },
        },
        comments: {
          getNewMentionUserIds: {
            with: async (inputs) => {
              mentionInputs = inputs;
              return ['new-user'];
            },
          },
        },
        notifications: {
          createOne: {
            with: async (inputs) => {
              createdNotifications.push(inputs);
            },
          },
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
    };

    await updateComment.fn({
      values: {
        text: updatedComment.text,
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1', boardId: 'board-1', name: 'Card' },
      record: previousComment,
      actorUser: { id: 'author', name: 'Author' },
    });

    expect(mentionInputs).to.deep.equal({
      text: updatedComment.text,
      previousText: previousComment.text,
      boardId: 'board-1',
      exceptUserIdOrIds: 'author',
    });
    expect(createdNotifications).to.have.lengthOf(1);
    expect(createdNotifications[0].values).to.include({
      userId: 'new-user',
      comment: updatedComment,
      type: 'mentionInComment',
    });
  });

  it('sends mention email to the mentioned user address', async () => {
    const sentEmails = [];
    const mentionedUser = {
      id: 'mentioned',
      email: 'mentioned@example.com',
      language: 'en',
      name: 'Mentioned User',
    };

    global.Notification = {
      ...global.Notification,
      qm: {
        createOne: async (values) => ({
          id: 'notification-1',
          ...values,
        }),
      },
    };
    global.NotificationService = {
      qm: {
        getByUserId: async () => [],
      },
    };
    global.User = {
      NotificationLevels: {
        NONE: 'none',
        ESSENTIAL: 'essential',
      },
      qm: {
        getOneById: async () => mentionedUser,
      },
    };
    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost:3008',
          globalNotifications: {
            enabled: true,
          },
        },
      },
      hooks: {
        smtp: {
          isEnabled: () => false,
        },
      },
      log: {
        error: () => {},
        info: () => {},
        warn: () => {},
      },
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        lists: {
          makeName: (list) => list.name,
        },
        users: {
          presentOne: (user) => user,
        },
        utils: {
          compileEmailTemplate: {
            with: async () => '<p>Mention</p>',
          },
          makeTranslator: () => (key) => key,
          sendGlobalNotification: {
            with: async (inputs) => {
              sentEmails.push(inputs);
            },
          },
          sendWebhooks: {
            with: () => {},
          },
        },
      },
    };

    await createNotification.fn({
      values: {
        userId: mentionedUser.id,
        comment: { id: 'comment-1' },
        type: 'mentionInComment',
        data: {
          text: 'Hello @[Mentioned User](mentioned)',
        },
        creatorUser: {
          id: 'author',
          name: 'Author',
        },
        card: {
          id: 'card-1',
          boardId: 'board-1',
          name: 'Card',
        },
      },
      project: {
        id: 'project-1',
        name: 'Project',
      },
      board: {
        id: 'board-1',
        name: 'Board',
      },
      list: {
        id: 'list-1',
        name: 'List',
      },
    });

    expect(sentEmails).to.have.lengthOf(1);
    expect(sentEmails[0]).to.include({
      to: mentionedUser.email,
    });
    expect(sentEmails[0].subject).to.include('You Were Mentioned in Comment');
  });

  it('does not send email for an unmentioned subscriber comment notification', async () => {
    const sentEmails = [];
    const subscriber = {
      id: 'subscriber',
      email: 'subscriber@example.com',
      language: 'en',
      name: 'Subscriber',
    };

    global.Notification = {
      ...global.Notification,
      qm: {
        createOne: async (values) => ({
          id: 'notification-1',
          ...values,
        }),
      },
    };
    global.NotificationService = {
      qm: {
        getByUserId: async () => [],
      },
    };
    global.User = {
      NotificationLevels: {
        NONE: 'none',
        ESSENTIAL: 'essential',
      },
      qm: {
        getOneById: async () => subscriber,
      },
    };
    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost:3008',
          globalNotifications: {
            enabled: true,
          },
        },
      },
      hooks: {
        smtp: {
          isEnabled: () => false,
        },
      },
      log: {
        error: () => {},
        info: () => {},
        warn: () => {},
      },
      sockets: {
        broadcast: () => {},
      },
      helpers: {
        lists: {
          makeName: (list) => list.name,
        },
        users: {
          presentOne: (user) => user,
        },
        utils: {
          compileEmailTemplate: {
            with: async () => '<p>Comment</p>',
          },
          makeTranslator: () => (key) => key,
          sendGlobalNotification: {
            with: async (inputs) => {
              sentEmails.push(inputs);
            },
          },
          sendWebhooks: {
            with: () => {},
          },
        },
      },
    };

    await createNotification.fn({
      values: {
        userId: subscriber.id,
        comment: { id: 'comment-1' },
        type: 'commentCard',
        data: {
          text: 'A comment without a mention',
        },
        creatorUser: {
          id: 'author',
          name: 'Author',
        },
        card: {
          id: 'card-1',
          boardId: 'board-1',
          name: 'Card',
        },
      },
      project: {
        id: 'project-1',
        name: 'Project',
      },
      board: {
        id: 'board-1',
        name: 'Board',
      },
      list: {
        id: 'list-1',
        name: 'List',
      },
    });

    expect(sentEmails).to.have.lengthOf(0);
  });
});
