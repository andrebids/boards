import orm from '../orm';
import { selectArchivedProjectsForCurrentUser } from './users';
import { selectSidebarProjects } from './sidebarSelectors';
import { selectIsProjectWithIdExternalAccessibleForCurrentUser } from './projects';

jest.mock('../constants/Config', () => ({ __esModule: true, default: { POSITION_GAP: 65536 } }));
jest.mock('../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));

const fixture = () => {
  const session = orm.session(orm.getEmptyState());
  const user = session.User.create({ id: 'user', role: 'projectOwner', name: 'Manager' });
  ['active', 'hidden', 'archived', 'both', 'private-other'].forEach((id) => {
    session.Project.create({
      id,
      name: id,
      isHidden: ['hidden', 'both'].includes(id),
      isArchived: ['archived', 'both', 'private-other'].includes(id),
      isFavorite: true,
      ownerProjectManagerId: `manager-${id}`,
    });
    session.ProjectManager.create({
      id: `manager-${id}`,
      projectId: id,
      userId: id === 'private-other' ? 'other' : 'user',
    });
  });
  const state = () => ({
    auth: { userId: 'user' },
    orm: session.state,
    sidebar: { projectsOrder: ['archived', 'hidden', 'both', 'active'] },
  });
  return { session, user, state };
};

test('separates active, hidden and archived projects without losing favorites or access', () => {
  const { session, user, state } = fixture();
  expect(user.getFilteredProjectsModelArray('', false).map((p) => p.id)).toEqual(['active']);
  expect(user.getFilteredProjectsModelArray('', true).map((p) => p.id)).toEqual(['hidden']);
  expect(user.getFavoriteProjectsModelArray().map((p) => p.id)).toEqual(['active']);
  expect(selectArchivedProjectsForCurrentUser(state()).map((p) => p.id)).toEqual([
    'archived',
    'both',
  ]);
  expect(selectSidebarProjects(state()).map((p) => p.id)).toEqual(['active']);
  session.Project.withId('both').update({ isArchived: false });
  expect(session.Project.withId('both').isFavorite).toBe(true);
  expect(
    user
      .getFilteredProjectsModelArray('', true)
      .map((p) => p.id)
      .sort(),
  ).toEqual(['both', 'hidden']);
  expect(selectArchivedProjectsForCurrentUser(state()).map((p) => p.id)).toEqual(['archived']);
});

test('filters before the sidebar limit even with a saved order', () => {
  const { session, state } = fixture();
  for (let i = 0; i < 55; i += 1) {
    session.Project.create({ id: `old-${i}`, name: `Old ${i}`, isArchived: true });
    session.ProjectManager.create({ id: `pm-${i}`, userId: 'user', projectId: `old-${i}` });
  }
  session.Project.create({ id: 'last', name: 'Last active' });
  session.ProjectManager.create({ id: 'pm-last', userId: 'user', projectId: 'last' });
  expect(selectSidebarProjects(state()).map((p) => p.id)).toEqual(['active', 'last']);
});

test('archive capability matches manager/shared-admin permissions without exposing private projects', () => {
  const { session, state } = fixture();
  expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state(), 'archived')).toBe(true);
  expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state(), 'private-other')).toBe(
    false,
  );
  session.User.withId('user').update({ role: 'admin' });
  expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state(), 'private-other')).toBe(
    false,
  );
  session.Project.create({ id: 'shared', name: 'Shared', isArchived: true });
  expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state(), 'shared')).toBe(true);
});
