/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const cardLabel = await CardLabel.qm.deleteOne(inputs.record.id);

    if (cardLabel) {
      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'cardLabelDelete',
        {
          item: cardLabel,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'cardLabelDelete',
        buildData: () => ({
          item: cardLabel,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
            cards: [inputs.card],
          },
        }),
        user: inputs.actorUser,
      });

      // Criar atividade para remoção de label
      try {
        // Verificar se o card tem todas as propriedades necessárias
        if (!inputs.card.boardId) {
          // Buscar o card completo se não tiver boardId
          const fullCard = await Card.qm.getOneById(inputs.card.id);
          if (fullCard) {
            inputs.card = fullCard;
          }
        }

        await sails.helpers.actions.createOne.with({
          values: {
            type: 'removeLabelFromCard',
            data: {
              labelId: cardLabel.labelId,
              labelName: inputs.record.label?.name || 'Label desconhecido',
              labelColor: inputs.record.label?.color || 'unknown',
              cardId: inputs.card.id,
              cardName: inputs.card.name,
            },
            user: inputs.actorUser,
            card: inputs.card,
          },
          project: inputs.project,
          board: inputs.board,
          list: inputs.list,
        });
      } catch (activityError) {
        console.error('❌ [HELPER-CARD-LABELS] Erro ao criar atividade:', activityError.message);
        // Não deixar o erro parar o processo
      }
    }

    return cardLabel;
  },
};
