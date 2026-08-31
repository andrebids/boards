const { expect } = require('chai');

const getProjectAccess = require('../../api/helpers/presentations/get-project-access');
const presentOne = require('../../api/helpers/project-presentations/present-one');
const show = require('../../api/controllers/project-presentations/show');

describe('Project presentation access', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      Board: global.Board,
      BoardMembership: global.BoardMembership,
      Project: global.Project,
      ProjectPresentation: global.ProjectPresentation,
      User: global.User,
      sails: global.sails,
    };
  });

  afterEach(() => {
    Object.assign(global, previousGlobals);
  });

  it('allows a board editor to edit only presentations from their editable boards', async () => {
    global.User = { Roles: { ADMIN: 'admin' } };
    global.Board = {
      qm: {
        getByProjectId: async () => [{ id: 'board-editor' }, { id: 'board-viewer' }],
      },
    };
    global.BoardMembership = {
      Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
      qm: {
        getByProjectId: async () => [
          { boardId: 'board-editor', userId: 'user-1', role: 'editor' },
          { boardId: 'board-viewer', userId: 'user-1', role: 'viewer' },
        ],
      },
    };
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: () => ({ getProjectRelatedUserIds: async () => ['user-1'] }),
          },
        },
        users: {
          isProjectManager: async () => false,
        },
        utils: {
          mapRecords: (records) => records.map(({ id }) => id),
        },
      },
    };

    const access = await getProjectAccess.fn({
      project: { id: 'project-1', ownerProjectManagerId: 'manager-1' },
      user: { id: 'user-1', role: 'projectOwner' },
    });

    expect(access).to.deep.equal({
      canEdit: false,
      memberUserIds: ['user-1'],
      accessibleBoardIds: ['board-editor', 'board-viewer'],
      editableBoardIds: ['board-editor'],
    });
  });

  it('keeps project managers able to edit presentations from every project board', async () => {
    global.User = { Roles: { ADMIN: 'admin' } };
    global.Board = {
      qm: {
        getByProjectId: async () => [{ id: 'board-1' }, { id: 'board-2' }],
      },
    };
    global.BoardMembership = {
      Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
      qm: { getByProjectId: async () => [] },
    };
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: () => ({
              getProjectRelatedUserIds: async () => ['manager-1'],
            }),
          },
        },
        users: {
          isProjectManager: async () => true,
        },
        utils: {
          mapRecords: (records) => records.map(({ id }) => id),
        },
      },
    };

    const access = await getProjectAccess.fn({
      project: { id: 'project-1', ownerProjectManagerId: 'manager-1' },
      user: { id: 'manager-1', role: 'projectOwner' },
    });

    expect(access.editableBoardIds).to.deep.equal(['board-1', 'board-2']);
  });

  it('opens each presentation using the access level for its board', async () => {
    global.Project = {
      qm: { getOneById: async () => ({ id: 'project-1' }) },
    };
    global.ProjectPresentation = {
      qm: {
        getByProjectId: async () => [
          {
            id: 'presentation-editor',
            boardId: 'board-editor',
            cryptpadEditKey: 'edit-key',
            cryptpadViewKey: 'view-key',
          },
          {
            id: 'presentation-viewer',
            boardId: 'board-viewer',
            cryptpadEditKey: 'other-edit-key',
            cryptpadViewKey: 'other-view-key',
          },
        ],
      },
    };
    global.sails = {
      helpers: {
        presentations: {
          getProjectAccess: async () => ({
            canEdit: false,
            accessibleBoardIds: ['board-editor', 'board-viewer'],
            editableBoardIds: ['board-editor'],
          }),
        },
        projectPresentations: {
          presentOne: (record, canEdit) => presentOne.fn({ record, canEdit }),
        },
      },
    };

    const result = await show.fn.call(
      { req: { currentUser: { id: 'user-1' }, isSocket: false } },
      { projectId: 'project-1' },
    );

    expect(result.items).to.deep.include({
      id: 'presentation-editor',
      boardId: 'board-editor',
      cryptpadSessionKey: 'edit-key',
      cryptpadMode: 'edit',
    });
    expect(result.items).to.deep.include({
      id: 'presentation-viewer',
      boardId: 'board-viewer',
      cryptpadSessionKey: 'other-view-key',
      cryptpadMode: 'view',
    });
  });
});
