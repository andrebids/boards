const assert = require('node:assert/strict');
const lodash = require('lodash');

const bulkAdd = require('../../api/controllers/projects/add-card-members');
const memberOptions = require('../../api/controllers/projects/card-member-options');
const createAction = require('../../api/helpers/actions/create-one');
const presentUser = require('../../api/helpers/users/present-one');

describe('Project bulk card memberships', () => {
  let previousGlobals;
  let project;
  let users;
  let memberships;
  let cards;
  let cardMemberships;
  let calls;
  let actorIsManager;
  const request = { req: { currentUser: { id: '1' } } };
  const run = (overrides = {}) =>
    bulkAdd.fn.call(request, {
      projectId: '10',
      userIds: '2,3',
      preview: true,
      includeArchived: false,
      ...overrides,
    });

  beforeEach(() => {
    previousGlobals = Object.fromEntries(
      [
        '_',
        'sails',
        'Project',
        'Board',
        'List',
        'Card',
        'CardMembership',
        'BoardMembership',
        'User',
      ].map((key) => [key, global[key]]),
    );
    global._ = lodash;
    project = { id: '10', autoAddBoardMembersToCards: false };
    users = [
      { id: '1', name: 'Manager' },
      { id: '2', name: 'Member A' },
      { id: '3', name: 'Member B' },
      { id: '4', name: 'Inactive', isDeactivated: true },
      { id: '5', name: 'Unrelated admin', role: 'admin' },
    ];
    memberships = ['20', '21'].flatMap((boardId) =>
      ['1', '2', '3', '4'].map((userId) => ({
        boardId,
        userId,
        role: 'editor',
      })),
    );
    const lists = [
      { id: '30', boardId: '20', type: 'active' },
      { id: '31', boardId: '21', type: 'closed' },
      { id: '32', boardId: '20', type: 'archive' },
      { id: '33', boardId: '20', type: 'trash' },
    ];
    cards = lists.map((list, index) => ({
      id: String(40 + index),
      boardId: list.boardId,
      listId: list.id,
    }));
    cardMemberships = [{ cardId: '40', userId: '2' }];
    calls = [];
    actorIsManager = true;
    global.Project = { qm: { getOneById: async () => project } };
    global.User = {
      qm: {
        getByIds: async (ids) => users.filter(({ id }) => ids.includes(id)),
      },
    };
    global.Board = {
      qm: {
        getByProjectId: async () => [
          { id: '20', name: 'Board A' },
          { id: '21', name: 'Board B' },
        ],
      },
    };
    global.List = {
      Types: {
        ACTIVE: 'active',
        CLOSED: 'closed',
        ARCHIVE: 'archive',
        TRASH: 'trash',
      },
      find: async ({ boardId, type }) =>
        lists.filter((list) => boardId.includes(list.boardId) && type.includes(list.type)),
    };
    global.Card = {
      find: async ({ boardId, listId }) =>
        cards.filter((card) => boardId.includes(card.boardId) && listId.includes(card.listId)),
    };
    global.CardMembership = {
      find: async ({ cardId, userId }) =>
        cardMemberships.filter(
          (item) => cardId.includes(item.cardId) && userId.includes(item.userId),
        ),
    };
    global.BoardMembership = { Roles: { EDITOR: 'editor' } };
    global.sails = {
      hooks: { 'file-manager': { getInstance: () => ({ buildUrl: (path) => `/files/${path}` }) } },
      config: { custom: { userAvatarsPathSegment: 'user-avatars' } },
      helpers: {
        users: {
          isProjectManager: async () => actorIsManager,
          presentOne: (record) => presentUser.fn({ record }),
        },
        projects: {
          makeScoper: {
            with: () => ({
              getProjectManagerUserIds: async () => ['1'],
              getBoardMembershipsForWholeProject: async () => memberships,
              getBoardMemberUserIdsForWholeProject: async () => [
                ...new Set(memberships.map(({ userId }) => userId)),
              ],
            }),
          },
        },
        cardMemberships: {
          createOne: {
            with: async (inputs) => {
              calls.push(inputs);
              cardMemberships.push({
                cardId: inputs.values.card.id,
                userId: inputs.values.user.id,
              });
            },
          },
        },
      },
      log: { error: () => {} },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([key, value]) => {
      if (value === undefined) {
        delete global[key];
      } else {
        global[key] = value;
      }
    });
  });

  it('offers active project members and managers, never unrelated global admins', async () => {
    const { items } = await memberOptions.fn.call(request, { projectId: '10' });
    assert.deepEqual(
      items.map(({ id }) => id),
      ['1', '2', '3'],
    );
  });

  it('includes presented avatars and only the fields needed by the member picker', async () => {
    Object.assign(users[1], {
      username: 'member-a',
      email: 'private@example.test',
      password: 'private-hash',
      avatar: { dirname: 'member-a-avatar', extension: 'png' },
    });
    const { items } = await memberOptions.fn.call(request, { projectId: '10' });
    assert.deepEqual(
      items.find(({ id }) => id === '2'),
      {
        id: '2',
        name: 'Member A',
        username: 'member-a',
        avatar: {
          url: '/files/user-avatars/member-a-avatar/original.png',
          thumbnailUrls: { cover180: '/files/user-avatars/member-a-avatar/cover-180.png' },
        },
      },
    );
  });

  it('requires project manager access for both listing and execution', async () => {
    actorIsManager = false;
    await assert.rejects(memberOptions.fn.call(request, { projectId: '10' }), {
      projectNotFound: 'Project not found',
    });
    await assert.rejects(run({ preview: false }), {
      projectNotFound: 'Project not found',
    });
    assert.equal(calls.length, 0);
  });

  it('rejects nonexistent projects', async () => {
    project = null;
    await assert.rejects(run(), { projectNotFound: 'Project not found' });
  });

  it('previews multiple members without writes, excluding archive and trash', async () => {
    const { item } = await run();
    assert.equal(item.cardsTotal, 2);
    assert.equal(item.boardsTotal, 2);
    assert.equal(item.usersTotal, 2);
    assert.equal(item.additionsTotal, 3);
    assert.equal(item.existingTotal, 1);
    assert.equal(item.canApply, true);
    assert.equal(calls.length, 0);
  });

  it('includes archived cards only when requested, always excludes trash', async () => {
    const { item } = await run({ includeArchived: true, preview: false });
    assert.equal(item.cardsTotal, 3);
    assert.equal(item.addedTotal, 5);
    assert.ok(calls.every(({ values }) => values.card.id !== '43'));
  });

  it('supports a single selection, preserves other members and can be repeated safely', async () => {
    const { item } = await run({ userIds: '2,2', preview: false });
    assert.equal(item.addedTotal, 1);
    assert.equal(item.usersTotal, 1);
    assert.equal(cardMemberships.length, 2);
    const repeated = await run({ userIds: '2', preview: false });
    assert.equal(repeated.item.addedTotal, 0);
    assert.equal(repeated.item.existingTotal, 2);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].skipNotifications, true);
  });

  it('requires selected users to already belong to the project and be active', async () => {
    await Promise.all(
      ['5', '4', '999'].map((userIds) =>
        assert.rejects(run({ userIds, preview: false }), {
          userNotProjectMember: 'Select active members of this project',
        }),
      ),
    );
    assert.equal(calls.length, 0);
  });

  it('blocks the entire execution if any selected user lacks board access', async () => {
    memberships = memberships.filter((item) => item.userId !== '3' || item.boardId !== '21');
    const { item } = await run({ preview: false });
    assert.equal(item.canApply, false);
    assert.deepEqual(item.missingBoardMemberships, [
      {
        userId: '3',
        userName: 'Member B',
        boardId: '21',
        boardName: 'Board B',
      },
    ]);
    assert.equal(calls.length, 0);
  });

  it('revalidates board permissions after preview before applying', async () => {
    assert.equal((await run()).item.canApply, true);
    memberships.find((item) => item.userId === '1' && item.boardId === '21').role = 'viewer';
    const { item } = await run({ preview: false });
    assert.equal(item.canApply, false);
    assert.deepEqual(item.forbiddenBoards, [{ id: '21', name: 'Board B' }]);
    assert.equal(calls.length, 0);
  });

  it('does not change the legacy automatic policy', async () => {
    project.autoAddBoardMembersToCards = true;
    await assert.rejects(run({ preview: false }), {
      automaticMembershipsEnabled: 'Automatic card memberships are enabled',
    });
    assert.equal(calls.length, 0);
  });

  it('reports partial failures and treats concurrent duplicates as already added', async () => {
    sails.helpers.cardMemberships.createOne.with = async ({ values: { card, user } }) => {
      if (card.id === '40') {
        throw 'userAlreadyCardMember';
      }
      if (user.id === '3') {
        throw new Error('Write failed');
      }
    };
    const { item } = await run({ preview: false });
    assert.equal(item.addedTotal, 1);
    assert.equal(item.alreadyAddedTotal, 1);
    assert.equal(item.failedTotal, 1);
  });

  it('limits simultaneous writes while completing larger batches', async () => {
    cards = Array.from({ length: 24 }, (_, index) => ({
      id: String(index + 100),
      boardId: '20',
      listId: '30',
    }));
    let active = 0;
    let maximum = 0;
    sails.helpers.cardMemberships.createOne.with = async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
      active -= 1;
    };
    const { item } = await run({ preview: false });
    assert.equal(item.addedTotal, 48);
    assert.ok(maximum <= 10);
  });

  it('retains action history and realtime events without individual bulk notifications', async () => {
    let actionsTotal = 0;
    let notificationsTotal = 0;
    let broadcastsTotal = 0;
    sails.models = {
      action: {
        INTERNAL_NOTIFIABLE_TYPES: ['addMemberToCard'],
        PERSONAL_NOTIFIABLE_TYPES: ['addMemberToCard'],
        EXTERNAL_NOTIFIABLE_TYPES: [],
        qm: {
          createOne: async (values) => {
            actionsTotal += 1;
            return { id: '70', ...values };
          },
        },
      },
    };
    sails.sockets = {
      broadcast: () => {
        broadcastsTotal += 1;
      },
    };
    sails.helpers.utils = { sendWebhooks: { with: () => {} } };
    sails.helpers.notifications = {
      createOne: {
        with: async () => {
          notificationsTotal += 1;
        },
      },
    };
    const values = {
      type: 'addMemberToCard',
      data: { user: { id: '2' } },
      user: { id: '1' },
      card: { id: '40', boardId: '20' },
    };
    await createAction.fn({
      values,
      board: { id: '20' },
      skipNotifications: true,
    });
    assert.equal(actionsTotal, 1);
    assert.equal(broadcastsTotal, 1);
    assert.equal(notificationsTotal, 0);
    await createAction.fn({ values, board: { id: '20' } });
    assert.equal(notificationsTotal, 1);
  });
});
