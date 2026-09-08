import {
  canUserManageUsers,
  canUserListUsers,
  isUserAdminOrProjectOwner,
} from './record-helpers';
import { UserRoles } from '../constants/Enums';

test.each([
  [UserRoles.ADMIN, true, true, true],
  [UserRoles.USER_MANAGER, true, true, true],
  [UserRoles.PROJECT_OWNER, false, true, true],
  [UserRoles.BOARD_USER, false, false, false],
])(
  '%s keeps user administration separate from project creation',
  (role, manage, list, createProjects) => {
    const user = { role };
    expect(canUserManageUsers(user)).toBe(manage);
    expect(canUserListUsers(user)).toBe(list);
    expect(isUserAdminOrProjectOwner(user)).toBe(createProjects);
  }
);
