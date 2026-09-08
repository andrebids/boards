const { expect } = require('chai');
const lodash = require('lodash');
const projectDefinition = require('../../api/models/Project');
const updateOne = require('../../api/helpers/projects/update-one');

describe('Project archive', () => {
  let previous;
  let controller;
  beforeEach(() => {
    previous = Object.fromEntries(
      ['_', 'Project', 'ProjectManager', 'User', 'sails'].map((key) => [key, global[key]]),
    );
    global._ = lodash;
    global.Project = { ...projectDefinition, qm: {} };
    global.ProjectManager = { qm: {} };
    global.User = { Roles: { ADMIN: 'admin' } };
    // The action schema references the Sails models at load time.
    controller = require('../../api/controllers/projects/update'); // eslint-disable-line global-require
  });
  afterEach(() =>
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }),
  );

  [true, false].forEach((isArchived) => {
    [
      { name: 'private manager', owner: 'manager', manager: true, allowed: true },
      { name: 'shared manager', owner: null, manager: true, allowed: true },
      { name: 'shared admin', owner: null, role: 'admin', allowed: true },
      { name: 'private outsider admin', owner: 'manager', role: 'admin', allowed: false },
      { name: 'ordinary member', owner: null, role: 'boardUser', allowed: false },
    ].forEach(({ name, owner, manager, role = 'projectOwner', allowed }) => {
      it(`${allowed ? 'allows' : 'rejects'} ${name} setting archive=${isArchived}`, async () => {
        const project = { id: '1', ownerProjectManagerId: owner, isArchived: !isArchived };
        const calls = [];
        Project.qm.getOneById = async () => project;
        ProjectManager.qm.getOneByProjectIdAndUserId = async () =>
          manager ? { id: 'manager' } : null;
        global.sails = {
          helpers: {
            projects: {
              updateOne: {
                with: (args) => {
                  calls.push(args);
                  const result = Promise.resolve({ ...project, isArchived });
                  result.intercept = () => result;
                  return result;
                },
              },
            },
          },
        };
        let error;
        try {
          await controller.fn.call(
            { req: { currentUser: { id: 'user', role } } },
            { id: '1', isArchived },
          );
        } catch (caught) {
          error = caught;
        }
        if (allowed) {
          expect(error).to.equal(undefined);
          expect(calls[0].values.isArchived).to.equal(isArchived);
          expect(calls[0].values).not.to.have.property('isHidden');
        } else {
          expect(error).to.deep.equal({ notEnoughRights: 'Not enough rights' });
          expect(calls).to.have.length(0);
        }
      });
    });
  });

  it('updates only archive state and broadcasts archive and restore to all related users', async () => {
    const project = {
      id: '1',
      isHidden: true,
      isArchived: false,
      backgroundType: 'gradient',
      backgroundGradient: 'ocean-dive',
    };
    const events = [];
    Project.qm.updateOne = async (id, values) => {
      expect(id).to.equal(project.id);
      expect(values).to.have.all.keys('isArchived', 'backgroundImageId');
      return Object.assign(project, values);
    };
    global.sails = {
      sockets: { broadcast: (...args) => events.push(args) },
      helpers: {
        projects: {
          makeScoper: { with: () => ({ getProjectRelatedUserIds: async () => ['u1', 'u2'] }) },
        },
        utils: { sendWebhooks: { with: () => {} } },
      },
    };
    const setArchive = async (isArchived) => {
      await updateOne.fn({
        record: { ...project },
        values: { isArchived },
        actorUser: { id: 'u1' },
      });
      expect(project.isArchived).to.equal(isArchived);
      expect(project.isHidden).to.equal(true);
    };
    await setArchive(true);
    await setArchive(false);
    expect(events.map(([room, event]) => [room, event])).to.deep.equal([
      ['user:u1', 'projectUpdate'],
      ['user:u2', 'projectUpdate'],
      ['user:u1', 'projectUpdate'],
      ['user:u2', 'projectUpdate'],
    ]);
  });
});
