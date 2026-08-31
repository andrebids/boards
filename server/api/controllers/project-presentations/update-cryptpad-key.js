/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PRESENTATION_NOT_FOUND: { presentationNotFound: 'Presentation not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    keyVersion: { type: 'number', required: true },
    editKey: { type: 'string', required: true, minLength: 1 },
    viewKey: { type: 'string', required: true, minLength: 1 },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    presentationNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const presentation = await ProjectPresentation.qm.getOneById(inputs.id);
    const project = presentation && (await Project.qm.getOneById(presentation.projectId));
    const board =
      presentation && presentation.boardId && (await Board.qm.getOneById(presentation.boardId));
    const access =
      project && (await sails.helpers.presentations.getProjectAccess(project, currentUser));

    if (
      !presentation ||
      !board ||
      !access ||
      !access.accessibleBoardIds.includes(presentation.boardId)
    ) {
      throw Errors.PRESENTATION_NOT_FOUND;
    }
    if (!access.editableBoardIds.includes(presentation.boardId)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const updatedPresentation = await ProjectPresentation.qm.updateOne(
      { id: presentation.id, cryptpadKeyVersion: inputs.keyVersion },
      {
        cryptpadEditKey: inputs.editKey,
        cryptpadViewKey: inputs.viewKey,
        cryptpadKeyVersion: inputs.keyVersion + 1,
      },
    );

    if (updatedPresentation) {
      const scoper = sails.helpers.projects.makeScoper.with({
        record: project,
        board,
      });
      const boardRelatedUserIds = await scoper.getBoardRelatedUserIds();

      boardRelatedUserIds.forEach((userId) => {
        sails.sockets.broadcast(
          `@user:${userId}`,
          'projectPresentationUpdate',
          { item: _.omit(updatedPresentation, ['cryptpadEditKey', 'cryptpadViewKey']) },
          this.req,
        );
      });

      return {
        key: inputs.editKey,
        keyVersion: inputs.keyVersion + 1,
      };
    }

    const currentPresentation = await ProjectPresentation.qm.getOneById(inputs.id);

    return {
      key: currentPresentation.cryptpadEditKey,
      keyVersion: currentPresentation.cryptpadKeyVersion,
    };
  },
};
