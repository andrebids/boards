/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    import: {
      type: 'json',
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    requestId: {
      type: 'string',
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const scoper = sails.helpers.projects.makeScoper.with({
      record: values.project,
    });

    const boards = await Board.qm.getByProjectId(values.project.id);

    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      boards,
    );

    values.position = position;

    if (repositions.length > 0) {
      await scoper.getUserIdsWithFullProjectVisibility();
      const clonedScoper = scoper.clone();

      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of repositions) {
        // eslint-disable-next-line no-await-in-loop
        await Board.qm.updateOne(
          {
            id: reposition.record.id,
            projectId: reposition.record.projectId,
          },
          {
            position: reposition.position,
          },
        );

        clonedScoper.replaceBoard(reposition.record);
        // eslint-disable-next-line no-await-in-loop
        const boardRelatedUserIds = await clonedScoper.getBoardRelatedUserIds();

        boardRelatedUserIds.forEach((userId) => {
          sails.sockets.broadcast(`user:${userId}`, 'boardUpdate', {
            item: {
              id: reposition.record.id,
              position: reposition.position,
            },
          });
        });

        // TODO: send webhooks
      }
    }

    const { board, boardMembership, lists } = await Board.qm.createOne(
      {
        ...values,
        projectId: values.project.id,
      },
      {
        user: inputs.actorUser,
      },
    );

    // ========================================
    // APLICAR DEFAULT LABELS (Feature)
    // ========================================
    try {
      console.log(`🔵 [HOOK] Novo board criado (${board.id}), a verificar default labels...`);
      const defaultLabels = await sails.models.organizationdefaultlabel.qm.getAll();
      
      if (defaultLabels.length > 0) {
        console.log(`🔵 [HOOK] A aplicar ${defaultLabels.length} default labels ao board ${board.id}`);
        // Criar labels no novo board
        for (const defaultLabel of defaultLabels) {
          await sails.models.label.create({
            boardId: board.id,
            name: defaultLabel.name,
            color: defaultLabel.color,
            position: defaultLabel.position,
          });
        }
        
        console.log(`✅ [HOOK] ${defaultLabels.length} default labels aplicados ao board ${board.id}`);
        sails.log.info(
          `[ORG_DEFAULT_LABELS] Applied ${defaultLabels.length} default labels to board ${board.id}`
        );
      } else {
        console.log(`⚠️ [HOOK] Nenhum default label configurado`);
      }
    } catch (error) {
      console.log(`🔴 [HOOK] Erro ao aplicar default labels:`, error.message);
      sails.log.error('[ORG_DEFAULT_LABELS] Error applying default labels:', error);
      // Não falhar a criação do board por causa disto
    }
    // ========================================

    if (inputs.import && inputs.import.type === Board.ImportTypes.TRELLO) {
      await sails.helpers.boards.importFromTrello(board, lists, inputs.import.board);
    }

    scoper.board = board;
    scoper.boardMemberships = [boardMembership];

    const boardRelatedUserIds = await scoper.getBoardRelatedUserIds();

    boardRelatedUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'boardCreate',
        {
          item: board,
          included: {
            boardMemberships: userId === boardMembership.userId ? [boardMembership] : [],
          },
          requestId: inputs.requestId,
        },
        inputs.request,
      );
    });

    sails.helpers.utils.sendWebhooks.with({
      event: 'boardCreate',
      buildData: () => ({
        item: board,
        included: {
          projects: [values.project],
          boardMemberships: [boardMembership],
        },
      }),
      user: inputs.actorUser,
    });

    return {
      board,
      boardMembership,
    };
  },
};
