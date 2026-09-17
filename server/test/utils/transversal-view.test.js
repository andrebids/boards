const assert = require('node:assert/strict');
const { groupLists, canUseView, isUserIds } = require('../../utils/transversal-view');
const context = require('../../api/helpers/transversal/get-context');
const options = require('../../api/controllers/transversal/options');
const cards = require('../../api/controllers/transversal/cards');

describe('Transversal view', () => {
  let saved;
  let project;
  let isManager;
  let listCriteria;
  const boards = [
    { id: '11', name: 'Allowed' },
    { id: '12', name: 'Private' },
  ];
  const lists = [
    { id: '21', boardId: '11', name: ' LOGISTIQUE ', type: 'active' },
    { id: '22', boardId: '12', name: 'Logistique', type: 'active' },
    { id: '23', boardId: '12', name: 'SECRET', type: 'active' },
  ];
  beforeEach(() => {
    saved = Object.fromEntries(
      [
        'Project',
        'User',
        'Board',
        'BoardMembership',
        'List',
        'Card',
        'CardMembership',
        'CardLabel',
        'Label',
        'sails',
      ].map((key) => [key, global[key]]),
    );
    project = { id: '1', transversalMode: 'all', transversalUserIds: [] };
    isManager = false;
    global.Project = { qm: { getOneById: async () => project } };
    global.User = { Roles: { ADMIN: 'admin' }, qm: { getByIds: async () => [] } };
    global.Board = { qm: { getByProjectId: async () => boards } };
    global.BoardMembership = {
      qm: { getByProjectId: async () => [{ userId: '2', boardId: '11' }] },
    };
    global.List = {
      FINITE_TYPES: ['active', 'closed'],
      find: (criteria) => {
        listCriteria = criteria;
        return {
          sort: async () => lists.filter((list) => criteria.boardId.includes(list.boardId)),
        };
      },
    };
    global.CardLabel = { qm: { getByCardIds: async () => [] } };
    global.Label = { qm: { getByIds: async () => [] } };
    global.sails = {
      helpers: {
        users: {
          isProjectManager: async () => isManager,
          presentOne: ({ id, name }) => ({ id, name, avatar: null }),
        },
        transversal: {
          getContext: (projectId, user) => ({
            intercept: async (_, mapError) => {
              try {
                return await context.fn({ projectId, user });
              } catch (error) {
                if (error === 'notFound') throw mapError();
                throw error;
              }
            },
          }),
        },
      },
    };
  });
  afterEach(() =>
    Object.entries(saved).forEach(([key, value]) => {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }),
  );

  it('groups only equivalent names and retains list IDs without losing order', () => {
    assert.deepEqual(
      groupLists([
        { id: '1', name: '  Production   A ' },
        { id: '2', name: 'PRODUCTION A' },
        { id: '3', name: 'Logistique' },
        { id: '4', name: 'Logistic' },
        { id: '5', name: null },
      ]),
      [
        { key: 'production a', name: 'Production A', listIds: ['1', '2'] },
        { key: 'logistique', name: 'Logistique', listIds: ['3'] },
        { key: 'logistic', name: 'Logistic', listIds: ['4'] },
      ],
    );
  });
  it('fails closed for disabled, missing or empty selections', () => {
    assert.equal(canUseView({}, '2'), false);
    assert.equal(
      canUseView({ transversalMode: 'disabled', transversalUserIds: ['2'] }, '2'),
      false,
    );
    assert.equal(canUseView({ transversalMode: 'selected', transversalUserIds: [] }, '2'), false);
    assert.equal(canUseView({ transversalMode: 'selected', transversalUserIds: ['2'] }, '2'), true);
    assert.equal(isUserIds(['2']), true);
    assert.equal(isUserIds(['not-an-id']), false);
    assert.equal(isUserIds([2]), false);
  });
  it('restricts columns to the same boards the viewer can read', async () => {
    const result = await options.fn.call(
      { req: { currentUser: { id: '2', role: 'boardUser' } } },
      { projectId: '1' },
    );
    assert.deepEqual(result.items, [{ key: 'logistique', name: 'LOGISTIQUE' }]);
    assert.deepEqual(result.included.boards, [boards[0]]);
    assert.deepEqual(listCriteria, { boardId: ['11'], type: ['active', 'closed'] });
  });
  it('denies a selected user after their project membership has been revoked', async () => {
    project.transversalMode = 'selected';
    project.transversalUserIds = ['3'];
    await assert.rejects(
      context.fn({ projectId: '1', user: { id: '3', role: 'boardUser' } }),
      (e) => e === 'notFound',
    );
  });
  it('keeps an administrator outside a private project without board membership', async () => {
    project.ownerProjectManagerId = '99';
    await assert.rejects(
      context.fn({ projectId: '1', user: { id: '3', role: 'admin' } }),
      (e) => e === 'notFound',
    );
  });
  it('allows full board visibility to managers, but does not bypass feature selection', async () => {
    isManager = true;
    const result = await context.fn({ projectId: '1', user: { id: '2' } });
    assert.equal(result.boards.length, 2);
    project.transversalMode = 'selected';
    await assert.rejects(
      context.fn({ projectId: '1', user: { id: '2' } }),
      (e) => e === 'notFound',
    );
  });
  it('rejects a forbidden board filter rather than widening the query', async () => {
    await assert.rejects(
      cards.fn.call(
        { req: { currentUser: { id: '2' } } },
        {
          projectId: '1',
          stage: 'logistique',
          boardId: '12',
        },
      ),
      (e) => Boolean(e.projectNotFound),
    );
  });
  it('returns an empty result for an unknown stage without querying cards', async () => {
    global.Card = { find: () => assert.fail('must not load any cards') };
    const result = await cards.fn.call(
      { req: { currentUser: { id: '2' } } },
      { projectId: '1', stage: 'missing' },
    );
    assert.deepEqual(result, { items: [], nextCursor: null });
  });
  it('bounds and scopes the query before loading card members', async () => {
    global.Card = {
      find: ({ where, select }) => {
        assert.deepEqual(where, { listId: ['21'], boardId: ['11'], id: { '>': '100' } });
        assert.ok(!select.includes('description'));
        return {
          sort: (sort) => {
            assert.equal(sort, 'id ASC');
            return {
              limit: async (limit) => {
                assert.equal(limit, 51);
                return Array.from({ length: 51 }, (_, i) => ({
                  id: String(101 + i),
                  boardId: '11',
                  listId: '21',
                  name: 'Card',
                }));
              },
            };
          },
        };
      },
    };
    global.CardMembership = {
      qm: {
        getByCardIds: async (ids) => {
          assert.equal(ids.length, 50);
          assert.ok(!ids.includes('151'));
          return [];
        },
      },
    };
    const result = await cards.fn.call(
      { req: { currentUser: { id: '2' } } },
      { projectId: '1', stage: 'LOGISTIQUE', after: '100' },
    );
    assert.equal(result.items.length, 50);
    assert.equal(result.nextCursor, '150');
    assert.equal(result.items[0].boardName, 'Allowed');
  });
});
