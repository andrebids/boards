// Visibility only: every API request independently checks project and board access.
export const canUseTransversal = (project, userId) =>
  Boolean(
    project &&
      userId &&
      (project.transversalMode === 'all' ||
        (project.transversalMode === 'selected' && project.transversalUserIds?.includes(userId))),
  );

export const isAccessError = (error) =>
  [401, 403, 404].includes(error?.statusCode) ||
  ['E_UNAUTHORIZED', 'E_FORBIDDEN', 'E_NOT_FOUND'].includes(error?.code);
