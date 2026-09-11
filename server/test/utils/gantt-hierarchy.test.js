const { expect } = require('chai');
const { getDescendantIds, isValidParent } = require('../../utils/gantt-hierarchy');

describe('Gantt hierarchy', () => {
  const group = { id: 'group', itemType: 'summary', ganttPlanId: 'plan' };
  const task = { id: 'task', itemType: 'task', ganttPlanId: 'plan', parentId: 'group' };
  const child = { ...task, id: 'child', parentId: 'task' };
  const sibling = { ...task, id: 'sibling' };
  const items = [group, task, child, sibling];

  it('allows group/task/subtask and an optional group above an independent task', () => {
    expect(isValidParent(items, child, task.id)).to.equal(true);
    expect(isValidParent(items, task, null)).to.equal(true);
    expect(isValidParent(items, child, sibling.id)).to.equal(true);
  });

  it('rejects a fourth level and moves that put descendants beyond the limit', () => {
    expect(isValidParent(items, { ...task, id: 'new' }, child.id)).to.equal(false);
    expect(isValidParent(items, task, sibling.id)).to.equal(false);
  });

  it('rejects cycles, self-parenting, missing parents and parents from another plan', () => {
    expect(isValidParent(items, task, child.id)).to.equal(false);
    expect(isValidParent(items, task, task.id)).to.equal(false);
    expect(isValidParent(items, child, 'missing')).to.equal(false);
    expect(
      isValidParent(
        [...items, { ...sibling, id: 'foreign', ganttPlanId: 'other' }],
        child,
        'foreign',
      ),
    ).to.equal(false);
    expect(isValidParent(items, group, task.id)).to.equal(false);
  });

  it('collects the complete deletion branch without siblings and terminates on corrupt cycles', () => {
    expect(getDescendantIds(items, group.id)).to.have.members(['task', 'child', 'sibling']);
    expect(getDescendantIds(items, task.id)).to.deep.equal(['child']);
    expect(getDescendantIds([{ ...task, parentId: 'child' }, child], task.id)).to.deep.equal([
      'child',
    ]);
  });
});

describe('Gantt update access boundaries', () => {
  const names = ['GanttItem', 'GanttPlan', 'Project', 'sails'];
  let previous;
  let update;
  let access;
  beforeEach(function setup() {
    this.timeout(10000);
    previous = Object.fromEntries(names.map((name) => [name, global[name]]));
    global.GanttItem = {
      Statuses: {},
      qm: { getOneById: async () => ({ id: 'task', ganttPlanId: 'plan', version: 2 }) },
    };
    global.GanttPlan = {
      qm: { getOneById: async () => ({ id: 'plan', projectId: 'project', isEnabled: true }) },
    };
    global.Project = { qm: { getOneById: async () => ({ id: 'project' }) } };
    global.sails = { helpers: { gantt: { getProjectAccess: async () => access } } };
    // Load the real action after supplying its model constants.
    update = require('../../api/controllers/gantt-items/update').fn; // eslint-disable-line global-require
  });
  afterEach(() => {
    names.forEach((name) => {
      if (previous[name] === undefined) delete global[name];
      else global[name] = previous[name];
    });
  });
  [
    ['hidden plans', null, 2, { ganttItemNotFound: 'Gantt item not found' }],
    ['read-only users', { canEdit: false }, 2, { notEnoughRights: 'Not enough rights' }],
    [
      'stale versions',
      { canEdit: true },
      1,
      { conflict: 'Gantt item was updated by another user' },
    ],
  ].forEach(([name, rights, version, expected]) => {
    it(`rejects ${name} before attempting a move`, async () => {
      access = rights;
      try {
        await update.call(
          { req: { currentUser: { id: 'user' } } },
          { id: 'task', parentId: 'parent', version },
        );
        throw new Error('Unexpectedly accepted invalid update');
      } catch (error) {
        expect(error).to.deep.equal(expected);
      }
    });
  });
});
