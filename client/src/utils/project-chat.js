import { UserRoles } from '../constants/Enums';

export const canManageProjectChat = ({ project, currentUser, isProjectManager }) =>
  isProjectManager || (currentUser.role === UserRoles.ADMIN && !project.ownerProjectManagerId);

export default {
  canManageProjectChat,
};
