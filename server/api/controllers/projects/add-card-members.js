const { idInput, idsInput } = require('../../../utils/inputs');

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    userIds: {
      ...idsInput,
      custom: (value) => value.split(',').length <= 100 && idsInput.custom(value),
      required: true,
    },
    includeArchived: { type: 'boolean', defaultsTo: false },
    preview: { type: 'boolean', defaultsTo: true },
  },
  exits: {
    projectNotFound: { responseType: 'notFound' },
    userNotProjectMember: { responseType: 'unprocessableEntity' },
    automaticMembershipsEnabled: { responseType: 'conflict' },
  },
  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);
    if (!project || !(await sails.helpers.users.isProjectManager(currentUser.id, project.id))) {
      throw { projectNotFound: 'Project not found' };
    }
    if (project.autoAddBoardMembersToCards) {
      throw {
        automaticMembershipsEnabled: 'Automatic card memberships are enabled',
      };
    }

    const userIds = [...new Set(inputs.userIds.split(','))];
    const scoper = sails.helpers.projects.makeScoper.with({ record: project });
    const boardMemberships = await scoper.getBoardMembershipsForWholeProject();
    const projectUserIds = new Set([
      ...(await scoper.getProjectManagerUserIds()),
      ...boardMemberships.map(({ userId }) => userId),
    ]);
    const users = await User.qm.getByIds(userIds);
    if (
      users.length !== userIds.length ||
      users.some((user) => user.isDeactivated || !projectUserIds.has(user.id))
    ) {
      throw { userNotProjectMember: 'Select active members of this project' };
    }

    const boards = await Board.qm.getByProjectId(project.id);
    const boardIds = boards.map(({ id }) => id);
    const listTypes = [List.Types.ACTIVE, List.Types.CLOSED];
    if (inputs.includeArchived) {
      listTypes.push(List.Types.ARCHIVE);
    }
    const lists = boardIds.length ? await List.find({ boardId: boardIds, type: listTypes }) : [];
    const cards = lists.length
      ? await Card.find({
          boardId: boardIds,
          listId: lists.map(({ id }) => id),
        })
      : [];
    const targetBoardIds = new Set(cards.map(({ boardId }) => boardId));
    const membershipsByBoard = _.groupBy(boardMemberships, 'boardId');
    const missingBoardMemberships = [];
    const forbiddenBoards = [];
    boards
      .filter(({ id }) => targetBoardIds.has(id))
      .forEach((board) => {
        const memberships = membershipsByBoard[board.id] || [];
        if (
          !memberships.some(
            ({ userId, role }) =>
              userId === currentUser.id && role === BoardMembership.Roles.EDITOR,
          )
        ) {
          forbiddenBoards.push(_.pick(board, ['id', 'name']));
        }
        users.forEach((user) => {
          if (!memberships.some(({ userId }) => userId === user.id)) {
            missingBoardMemberships.push({
              userId: user.id,
              userName: user.name,
              boardId: board.id,
              boardName: board.name,
            });
          }
        });
      });

    const existing = cards.length
      ? await CardMembership.find({
          cardId: cards.map(({ id }) => id),
          userId: userIds,
        })
      : [];
    const existingKeys = new Set(existing.map(({ cardId, userId }) => `${cardId}:${userId}`));
    const missingPairs = cards.flatMap((card) =>
      users
        .filter((user) => !existingKeys.has(`${card.id}:${user.id}`))
        .map((user) => ({ card, user })),
    );
    const summary = {
      cardsTotal: cards.length,
      boardsTotal: targetBoardIds.size,
      usersTotal: users.length,
      additionsTotal: missingPairs.length,
      existingTotal: existing.length,
      missingBoardMemberships,
      forbiddenBoards,
      canApply: missingBoardMemberships.length === 0 && forbiddenBoards.length === 0,
    };
    // Recompute membership and permissions on every execution, independently of the preview.
    if (inputs.preview || !summary.canApply) {
      return { item: summary };
    }

    const boardById = _.keyBy(boards, 'id');
    const listById = _.keyBy(lists, 'id');
    let addedTotal = 0;
    let alreadyAddedTotal = 0;
    let failedTotal = 0;
    const addPair = async ({ card, user }) => {
      try {
        await sails.helpers.cardMemberships.createOne.with({
          project,
          board: boardById[card.boardId],
          list: listById[card.listId],
          values: { card, user },
          actorUser: currentUser,
          skipNotifications: true,
        });
        addedTotal += 1;
      } catch (error) {
        if (error === 'userAlreadyCardMember') {
          alreadyAddedTotal += 1;
        } else {
          failedTotal += 1;
          sails.log.error(
            'Could not finish bulk card membership (card=%s, user=%s): %s',
            card.id,
            user.id,
            error.message || error,
          );
        }
      }
    };
    // ponytail: bounded in-request batches; a durable job is needed if projects outgrow HTTP timeouts.
    for (let offset = 0; offset < missingPairs.length; offset += 10) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(missingPairs.slice(offset, offset + 10).map(addPair));
    }
    return { item: { ...summary, addedTotal, alreadyAddedTotal, failedTotal } };
  },
};
