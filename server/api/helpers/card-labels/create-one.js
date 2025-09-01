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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    labelAlreadyInCard: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    let cardLabel;
    try {
      cardLabel = await CardLabel.qm.createOne({
        ...values,
        cardId: values.card.id,
        labelId: values.label.id,
      });
    } catch (error) {
      if (error.code === 'E_UNIQUE') {
        throw 'labelAlreadyInCard';
      }

      throw error;
    }

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'cardLabelCreate',
      {
        item: cardLabel,
      },
      inputs.request,
    );

    sails.helpers.utils.sendWebhooks.with({
      event: 'cardLabelCreate',
      buildData: () => ({
        item: cardLabel,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          labels: [values.label],
          lists: [inputs.list],
          cards: [values.card],
        },
      }),
      user: inputs.actorUser,
    });

    // Criar atividade para adição de label
    try {
      // Verificar se o card tem todas as propriedades necessárias
      if (!values.card.boardId) {
        // Buscar o card completo se não tiver boardId
        const fullCard = await Card.qm.getOneById(values.card.id);
        if (fullCard) {
          values.card = fullCard;
        }
      }

      // Verificar se todos os dados necessários estão presentes
      if (!values.card || !values.card.id) {
        console.error('❌ [HELPER-CARD-LABELS] Card inválido:', values.card);
        return cardLabel;
      }

      if (!values.label || !values.label.id) {
        console.error('❌ [HELPER-CARD-LABELS] Label inválido:', values.label);
        return cardLabel;
      }

      if (!inputs.actorUser || !inputs.actorUser.id) {
        console.error('❌ [HELPER-CARD-LABELS] Usuário inválido:', inputs.actorUser);
        return cardLabel;
      }

      await sails.helpers.actions.createOne.with({
        values: {
          type: 'addLabelToCard',
          data: {
            labelId: values.label.id,
            labelName: values.label.name,
            labelColor: values.label.color,
            cardId: values.card.id,
            cardName: values.card.name,
          },
          user: inputs.actorUser,
          card: values.card,
        },
        project: inputs.project,
        board: inputs.board,
        list: inputs.list,
      });
      
      console.log('✅ [HELPER-CARD-LABELS] Atividade criada com sucesso para label:', values.label.name);
    } catch (activityError) {
      console.error('❌ [HELPER-CARD-LABELS] Erro ao criar atividade:', activityError.message);
      console.error('❌ [HELPER-CARD-LABELS] Stack trace:', activityError.stack);
      // Não deixar o erro parar o processo
    }

    return cardLabel;
  },
};
