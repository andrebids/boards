const { expect } = require('chai');

const controller = require('../../api/controllers/comments/delete');

describe('Comment deletion permissions', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = { sails: global.sails, BoardMembership: global.BoardMembership };
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

  const cases = [
    { name: 'project manager', isManager: true, membership: null, canDeleteOwn: true },
    { name: 'editor', membership: { role: 'editor' }, canDeleteOwn: true },
    {
      name: 'commenting viewer',
      membership: { role: 'viewer', canComment: true },
      canDeleteOwn: true,
    },
    {
      name: 'read-only viewer',
      membership: { role: 'viewer', canComment: false },
      canDeleteOwn: false,
    },
    { name: 'non-member', membership: null, canDeleteOwn: false },
  ];

  cases.forEach(({ name, isManager = false, membership, canDeleteOwn }) => {
    [true, false].forEach((isAuthor) => {
      const allowed = isAuthor && canDeleteOwn;
      it(`${allowed ? 'allows' : 'rejects'} ${name} deleting ${isAuthor ? 'own' : "another user's"} comment`, async () => {
        const comment = { id: 'comment-1', userId: isAuthor ? 'user-1' : 'user-2' };
        const deleted = [];
        global.BoardMembership = {
          Roles: { EDITOR: 'editor' },
          qm: { getOneByBoardIdAndUserId: async () => membership },
        };
        global.sails = {
          helpers: {
            users: { isProjectManager: async () => isManager },
            comments: {
              getPathToProjectById: () => ({
                intercept: async () => ({
                  comment,
                  card: { id: 'card-1' },
                  list: { id: 'list-1' },
                  board: { id: 'board-1' },
                  project: { id: 'project-1' },
                }),
              }),
              deleteOne: {
                with: async ({ record }) => {
                  deleted.push(record);
                  return record;
                },
              },
            },
          },
        };

        let result;
        let error;
        try {
          result = await controller.fn.call(
            { req: { currentUser: { id: 'user-1' } } },
            { id: comment.id },
          );
        } catch (caught) {
          error = caught;
        }

        if (allowed) {
          expect(error).to.equal(undefined);
          expect(result).to.deep.equal({ item: comment });
          expect(deleted).to.deep.equal([comment]);
        } else {
          expect(error).to.deep.equal(
            !isManager && !membership
              ? { commentNotFound: 'Comment not found' }
              : { notEnoughRights: 'Not enough rights' },
          );
          expect(deleted).to.have.length(0);
        }
      });
    });
  });
});
