const assert = require('node:assert/strict');
const lodash = require('lodash');

const UserModel = require('../../api/models/User');
const canManageUsers = require('../../api/helpers/users/can-manage-users');
const isAdminOrProjectOwner = require('../../api/helpers/users/is-admin-or-project-owner');
const manageUsersPolicy = require('../../api/policies/can-manage-users');
const adminPolicy = require('../../api/policies/is-admin');
const projectOwnerPolicy = require('../../api/policies/is-admin-or-project-owner');
const { policies } = require('../../config/policies');
const presentUser = require('../../api/helpers/users/present-one');
const makeUserScoper = require('../../api/helpers/users/make-scoper');
const updateUser = require('../../api/helpers/users/update-one');
const resendWelcomeEmail = require('../../api/controllers/users/resend-welcome-email');
const showProject = require('../../api/controllers/projects/show');

describe('User manager permissions', () => {
  let previousGlobals;
  const manager = { id: 'manager', role: UserModel.Roles.USER_MANAGER };
  const context = { req: { currentUser: manager } };

  beforeEach(() => {
    previousGlobals = {};
    ['_', 'User', 'Session', 'Project', 'BoardMembership', 'sails'].forEach((key) => {
      previousGlobals[key] = global[key];
    });
    global._ = lodash;
    global.User = { ...UserModel, qm: {} };
    global.sails = {
      config: { custom: { defaultAdminEmail: 'admin@example.invalid' } },
      hooks: { 'file-manager': { getInstance: () => ({}) } },
      helpers: {
        users: {
          canManageUsers: (record) => canManageUsers.fn({ record }),
          isAdminOrProjectOwner: (record) => isAdminOrProjectOwner.fn({ record }),
        },
      },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([key, value]) => {
      if (value === undefined) delete global[key];
      else global[key] = value;
    });
  });

  it('combines user management and project-owner permissions without granting admin access', async () => {
    assert.deepEqual(policies['users/create'], ['is-authenticated', 'can-manage-users']);
    assert.deepEqual(policies['users/delete'], ['is-authenticated', 'is-admin']);
    assert.deepEqual(policies['projects/create'], [
      'is-authenticated',
      'is-admin-or-project-owner',
    ]);
    await Promise.all(
      Object.values(User.Roles).map(async (role) => {
        const req = { currentUser: { role } };
        const result = await manageUsersPolicy(req, { notFound: () => false }, () => true);
        assert.equal(result, ['admin', 'userManager'].includes(role));
        const canCreateProjects = await projectOwnerPolicy(
          req,
          { notFound: () => false },
          () => true,
        );
        assert.equal(canCreateProjects, ['admin', 'userManager', 'projectOwner'].includes(role));
      }),
    );
    assert.equal(isAdminOrProjectOwner.fn({ record: manager }), true);
    assert.equal(await adminPolicy(context.req, { notFound: () => false }, () => true), false);
  });

  it('lists users with their email and onboarding status, without passwords or personal settings', async () => {
    const record = {
      id: 'other',
      role: 'boardUser',
      email: 'other@example.invalid',
      password: 'secret',
      mustChangePassword: true,
      language: 'fr-FR',
    };
    User.qm.getAll = async () => [record];
    sails.helpers.users.presentMany = (users, user) =>
      users.map((item) => presentUser.fn({ record: item, user }));
    // eslint-disable-next-line global-require
    const result = await require('../../api/controllers/users/index').fn.call(context);
    assert.equal(result.items[0].email, record.email);
    assert.equal(result.items[0].mustChangePassword, true);
    assert.equal(result.items[0].password, undefined);
    assert.equal(result.items[0].language, undefined);
    assert.equal(
      presentUser.fn({ record, user: { id: 'outsider', role: 'boardUser' } }).email,
      undefined,
    );
  });

  it('sends full account events to user managers without duplicate public events', async () => {
    User.qm.getAll = async ({ roleOrRoles }) =>
      [manager, { id: 'admin', role: 'admin' }, { id: 'owner', role: 'projectOwner' }].filter(
        (user) => roleOrRoles.includes(user.role),
      );
    const scoper = makeUserScoper.fn({ record: { id: 'other' } });
    assert.deepEqual(await scoper.getPrivateUserRelatedUserIds(), ['other', 'admin', 'manager']);
    assert.deepEqual(await scoper.getPublicUserRelatedUserIds(true), ['owner']);
  });

  ['admin', 'userManager', 'projectOwner', 'boardUser'].forEach((role) => {
    [true, false].forEach((mustChangePassword) => {
      it(`${role}/${mustChangePassword}: resends only pending ordinary-user invitations`, async () => {
        const user = { id: 'other', role, mustChangePassword, language: 'fr-FR' };
        let passwordChanged = false;
        User.qm.getOneById = async () => user;
        User.qm.updateOne = async () => user;
        Object.assign(sails.helpers.users, {
          generateTemporaryPassword: () => 'temporary',
          updateOne: {
            with: async () => {
              passwordChanged = true;
              return user;
            },
          },
          sendWelcomeEmail: { with: async () => {} },
          presentOne: (record) => record,
        });
        if (role === 'boardUser' && mustChangePassword) {
          const result = await resendWelcomeEmail.fn.call(context, { id: user.id });
          assert.equal(result.included.welcomeEmailSent, true);
          assert.equal(passwordChanged, true);
        } else {
          await assert.rejects(resendWelcomeEmail.fn.call(context, { id: user.id }), {
            notEnoughRights: 'Not enough rights',
          });
          assert.equal(passwordChanged, false);
        }
      });
    });
  });

  it('rejects re-sending to deactivated, SSO and default-admin accounts and under enforced SSO', async () => {
    const patches = [
      { isDeactivated: true },
      { isSsoUser: true },
      { email: 'admin@example.invalid' },
    ];
    // These cases share mocks and must execute sequentially.
    // eslint-disable-next-line no-restricted-syntax
    for (const patch of patches) {
      User.qm.getOneById = async () => ({
        role: 'boardUser',
        mustChangePassword: true,
        language: 'fr-FR',
        ...patch,
      });
      // eslint-disable-next-line no-await-in-loop
      await assert.rejects(resendWelcomeEmail.fn.call(context, { id: 'other' }), {
        notEnoughRights: 'Not enough rights',
      });
    }
    sails.config.custom.oidcEnforced = true;
    await assert.rejects(resendWelcomeEmail.fn.call(context, { id: 'other' }), {
      notEnoughRights: 'Not enough rights',
    });
  });

  it('cannot promote itself, modify another account or reset an existing password', async () => {
    // eslint-disable-next-line global-require
    const update = require('../../api/controllers/users/update');
    // eslint-disable-next-line global-require
    const password = require('../../api/controllers/users/update-password');
    await assert.rejects(update.fn.call(context, { id: manager.id, role: 'admin' }), {
      notEnoughRights: 'Not enough rights',
    });
    await assert.rejects(update.fn.call(context, { id: 'other', role: 'admin' }), {
      userNotFound: 'User not found',
    });
    await assert.rejects(update.fn.call(context, { id: 'other', isDeactivated: true }), {
      userNotFound: 'User not found',
    });
    await assert.rejects(password.fn.call(context, { id: 'other', password: 'changed' }), {
      userNotFound: 'User not found',
    });
  });

  it('rejects direct project access when not a manager or board member', async () => {
    global.Project = { qm: { getOneById: async () => ({ id: 'hidden' }) } };
    global.BoardMembership = { qm: { getByProjectIdAndUserId: async () => [] } };
    sails.helpers.users.isProjectManager = async () => false;
    await assert.rejects(showProject.fn.call(context, { id: 'hidden' }), {
      projectNotFound: 'Project not found',
    });
  });

  ['userManager', 'projectOwner'].forEach((role) => {
    [true, false].forEach((hasUnassignedProject) => {
      it(`${role} ${hasUnassignedProject ? 'rejects' : 'allows'} bulk labels for ${hasUnassignedProject ? 'mixed assigned and unassigned' : 'assigned'} projects`, async () => {
        // eslint-disable-next-line global-require
        const bulkApply = require('../../api/controllers/organization-default-labels/bulk-apply');
        const projectIds = hasUnassignedProject ? [10, 20] : [10];
        global.Project = { find: async () => projectIds.map((id) => ({ id: String(id) })) };
        sails.helpers.users.getManagerProjectIds = async () => ['10'];
        let labelsRead = false;
        const applied = [];
        sails.models = {
          organizationdefaultlabel: {
            qm: {
              getAll: async () => {
                labelsRead = true;
                return [];
              },
            },
          },
        };
        sails.helpers.organizationDefaultLabels = {
          applyToBoards: {
            with: async ({ projectId }) => {
              applied.push(projectId);
              return { boardsProcessed: 0, labelsCreated: 0 };
            },
          },
        };
        sails.log = { warn: () => {}, info: () => {} };
        const run = bulkApply.fn.call(
          { req: { currentUser: { ...manager, role } } },
          { projectIds, overwriteMode: 'skip' },
        );
        if (hasUnassignedProject) {
          await assert.rejects(run, { notEnoughRights: 'Not enough rights' });
          assert.equal(labelsRead, false);
          assert.deepEqual(applied, []);
        } else {
          assert.equal((await run).summary.successful, 1);
          assert.deepEqual(applied, [10]);
        }
      });
    });
  });

  it('revokes sessions and all socket rooms after demotion, preserving project and board assignments', async () => {
    const sessionsDeleted = [];
    const roomsLeft = [];
    const events = [];
    const record = { id: manager.id, role: 'admin' };
    User.qm.updateOne = async (id, values) => ({ ...record, ...values });
    global.Session = { qm: { delete: async (criteria) => sessionsDeleted.push(criteria) } };
    sails.sockets = {
      broadcast: (room, event) => events.push([room, event]),
      leaveAll: (room) => roomsLeft.push(room),
    };
    Object.assign(sails.helpers.users, {
      presentOne: (user) => user,
      makeScoper: () => ({
        getPrivateUserRelatedUserIds: async () => [],
        getPublicUserRelatedUserIds: async () => [],
      }),
    });
    sails.helpers.utils = { sendWebhooks: { with: () => {} } };
    const result = await updateUser.fn({
      record,
      values: { role: 'userManager' },
      actorUser: { id: 'admin' },
    });
    assert.equal(result.role, 'userManager');
    assert.deepEqual(sessionsDeleted, [{ userId: manager.id }]);
    assert.deepEqual(roomsLeft, ['@user:manager']);
    assert.deepEqual(events, [['user:manager', 'userDelete']]);
  });
});
