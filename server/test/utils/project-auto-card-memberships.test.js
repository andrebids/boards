/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('node:assert/strict');
const lodash = require('lodash');

const syncMembersToCards = require('../../api/helpers/boards/sync-members-to-cards');
const updateProject = require('../../api/helpers/projects/update-one');

describe('Project automatic card memberships', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      BoardMembership: global.BoardMembership,
      Board: global.Board,
      Card: global.Card,
      CardMembership: global.CardMembership,
      List: global.List,
      Project: global.Project,
      User: global.User,
      _: global._,
      sails: global.sails,
    };

    global._ = lodash;
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

  it('creates only missing board-member and card combinations', async () => {
    const createdValues = [];

    global.BoardMembership = {
      qm: {
        getByBoardId: async () => [{ userId: 'user-1' }, { userId: 'user-2' }],
      },
    };
    global.Card = {
      qm: {
        getByBoardId: async () => [
          { id: 'card-1', listId: 'list-1' },
          { id: 'card-2', listId: 'list-1' },
        ],
      },
    };
    global.CardMembership = {
      qm: {
        getByCardIds: async () => [{ cardId: 'card-1', userId: 'user-1' }],
      },
    };
    global.List = {
      qm: {
        getByIds: async () => [{ id: 'list-1' }],
      },
    };
    global.User = {
      qm: {
        getByIds: async () => [{ id: 'user-1' }, { id: 'user-2' }],
      },
    };
    global.sails = {
      helpers: {
        cardMemberships: {
          createOne: {
            with: async ({ values }) => {
              createdValues.push({
                cardId: values.card.id,
                userId: values.user.id,
              });
            },
          },
        },
        utils: {
          mapRecords: (records, attribute = 'id') => records.map((record) => record[attribute]),
        },
      },
    };

    await syncMembersToCards.fn({
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor' },
    });

    assert.deepEqual(createdValues, [
      { cardId: 'card-1', userId: 'user-2' },
      { cardId: 'card-2', userId: 'user-1' },
      { cardId: 'card-2', userId: 'user-2' },
    ]);
  });

  it('synchronizes every board when the project setting is enabled', async () => {
    const synchronizedBoardIds = [];
    const nextProject = {
      id: 'project-1',
      backgroundType: null,
      autoAddBoardMembersToCards: true,
    };

    global.Project = {
      BackgroundTypes: {
        GRADIENT: 'gradient',
        IMAGE: 'image',
      },
      qm: {
        updateOne: async () => nextProject,
      },
    };
    global.Board = {
      qm: {
        getByProjectId: async () => [{ id: 'board-1' }, { id: 'board-2' }],
      },
    };
    global.sails = {
      helpers: {
        boards: {
          syncMembersToCards: {
            with: async ({ board }) => {
              synchronizedBoardIds.push(board.id);
            },
          },
        },
        utils: {
          sendWebhooks: {
            with: () => {},
          },
        },
      },
      sockets: {
        broadcast: () => {},
      },
    };

    const project = await updateProject.fn({
      record: {
        id: 'project-1',
        backgroundType: null,
        autoAddBoardMembersToCards: false,
      },
      values: {
        autoAddBoardMembersToCards: true,
      },
      actorUser: { id: 'actor' },
      scoper: {
        getProjectRelatedUserIds: async () => [],
      },
    });

    assert.equal(project, nextProject);
    assert.deepEqual(synchronizedBoardIds, ['board-1', 'board-2']);
  });
});
