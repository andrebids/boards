/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('node:assert/strict');
const lodash = require('lodash');

const BoardMembership = require('../../api/models/BoardMembership');
const Notification = require('../../api/models/Notification');
const createBoardMembership = require('../../api/helpers/board-memberships/create-one');

describe('Board membership notifications', () => {
  let previousGlobals;
  let notificationInputs;

  beforeEach(() => {
    previousGlobals = {
      _: global._,
      sails: global.sails,
      BoardMembership: global.BoardMembership,
      Notification: global.Notification,
    };

    notificationInputs = [];

    global._ = lodash;
    global.BoardMembership = BoardMembership;
    global.Notification = Notification;
    global.sails = {
      models: {
        boardmembership: {
          qm: {
            createOne: async (values) => ({
              id: 'membership-1',
              ...values,
            }),
          },
        },
      },
      sockets: {
        addRoomMembersToRooms: (_source, _target, callback) => callback(),
        broadcast: () => {},
        removeRoomMembersFromRooms: (_source, _target, callback) => {
          if (callback) {
            callback();
          }
        },
      },
      helpers: {
        notifications: {
          createOne: {
            with: async (inputs) => {
              notificationInputs.push(inputs);
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
      log: {
        error: () => {},
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

  it('creates an essential notification when another user adds the member', async () => {
    const project = {
      id: 'project-1',
      name: 'Project',
    };
    const board = {
      id: 'board-1',
      name: 'Board',
      projectId: project.id,
    };
    const user = {
      id: 'recipient',
      name: 'Recipient',
    };
    const actorUser = {
      id: 'actor',
      name: 'Actor',
    };

    await createBoardMembership.fn({
      values: {
        role: BoardMembership.Roles.EDITOR,
        board,
        user,
      },
      project,
      actorUser,
    });

    assert.equal(notificationInputs.length, 1);
    assert.equal(notificationInputs[0].project, project);
    assert.equal(notificationInputs[0].board, board);
    assert.equal(notificationInputs[0].values.type, Notification.Types.ADD_MEMBER_TO_BOARD);
    assert.equal(notificationInputs[0].values.user, user);
    assert.equal(notificationInputs[0].values.creatorUser, actorUser);
    assert.deepEqual(notificationInputs[0].values.data.board, {
      id: board.id,
      name: board.name,
    });
  });

  it('does not notify a user who adds themselves', async () => {
    const user = {
      id: 'same-user',
      name: 'User',
    };

    await createBoardMembership.fn({
      values: {
        role: BoardMembership.Roles.EDITOR,
        board: {
          id: 'board-1',
          name: 'Board',
          projectId: 'project-1',
        },
        user,
      },
      project: {
        id: 'project-1',
        name: 'Project',
      },
      actorUser: user,
    });

    assert.equal(notificationInputs.length, 0);
  });
});
