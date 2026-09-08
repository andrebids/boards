const { idInput } = require('../../../utils/inputs');

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
  },
  exits: {
    projectNotFound: { responseType: 'notFound' },
  },
  async fn({ projectId }) {
    const project = await Project.qm.getOneById(projectId);
    if (
      !project ||
      !(await sails.helpers.users.isProjectManager(this.req.currentUser.id, projectId))
    ) {
      throw { projectNotFound: 'Project not found' };
    }

    const scoper = sails.helpers.projects.makeScoper.with({ record: project });
    const userIds = _.union(
      await scoper.getProjectManagerUserIds(),
      await scoper.getBoardMemberUserIdsForWholeProject(),
    );
    const users = await User.qm.getByIds(userIds);
    return {
      items: users
        .filter((user) => !user.isDeactivated)
        .map((user) =>
          _.pick(sails.helpers.users.presentOne(user, this.req.currentUser), [
            'id',
            'name',
            'username',
            'avatar',
          ]),
        ),
    };
  },
};
