const { canUseView } = require('../../../utils/transversal-view');

module.exports = {
  inputs: {
    projectId: { type: 'string', required: true },
    user: { type: 'ref', required: true },
  },
  exits: { notFound: {} },

  async fn({ projectId, user }) {
    const project = await Project.qm.getOneById(projectId);
    if (!project || !canUseView(project, user.id)) throw 'notFound';

    // Keep the same read policy as boards/show, including private projects.
    const isManager = await sails.helpers.users.isProjectManager(user.id, project.id);
    const hasFullAccess =
      isManager || (user.role === User.Roles.ADMIN && !project.ownerProjectManagerId);
    let boards = await Board.qm.getByProjectId(project.id);
    if (!hasFullAccess) {
      const memberships = await BoardMembership.qm.getByProjectId(project.id);
      const allowedIds = new Set(
        memberships.filter(({ userId }) => userId === user.id).map(({ boardId }) => boardId),
      );
      if (!allowedIds.size) throw 'notFound';
      boards = boards.filter(({ id }) => allowedIds.has(id));
    }
    const lists = boards.length
      ? await List.find({ boardId: boards.map(({ id }) => id), type: List.FINITE_TYPES }).sort([
          'position',
          'id',
        ])
      : [];
    return { boards, lists };
  },
};
