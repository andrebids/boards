import { UserRoles } from '../constants/Enums';
import { canManageProjectChat } from './project-chat';

describe('project chat management permissions', () => {
  test('allows a project manager to manage chat', () => {
    expect(
      canManageProjectChat({
        project: { ownerProjectManagerId: 'owner-manager' },
        currentUser: { role: UserRoles.PROJECT_OWNER },
        isProjectManager: true,
      }),
    ).toBe(true);
  });

  test('allows an administrator to manage chat in a shared project', () => {
    expect(
      canManageProjectChat({
        project: { ownerProjectManagerId: null },
        currentUser: { role: UserRoles.ADMIN },
        isProjectManager: false,
      }),
    ).toBe(true);
  });

  test('does not allow a regular project member to manage chat', () => {
    expect(
      canManageProjectChat({
        project: { ownerProjectManagerId: null },
        currentUser: { role: UserRoles.BOARD_USER },
        isProjectManager: false,
      }),
    ).toBe(false);
  });

  test('does not extend administration visibility to private projects', () => {
    expect(
      canManageProjectChat({
        project: { ownerProjectManagerId: 'owner-manager' },
        currentUser: { role: UserRoles.ADMIN },
        isProjectManager: false,
      }),
    ).toBe(false);
  });
});
