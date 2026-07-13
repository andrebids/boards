/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    conversationId: {
      type: 'string',
      required: true,
    },
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    let participant = await ChatParticipant.qm.getOneByConversationIdAndUserId(
      inputs.conversationId,
      inputs.userId,
    );

    if (participant) {
      return participant;
    }

    try {
      participant = await ChatParticipant.qm.createOne(inputs);
    } catch (error) {
      if (error.code !== 'E_UNIQUE') {
        throw error;
      }

      participant = await ChatParticipant.qm.getOneByConversationIdAndUserId(
        inputs.conversationId,
        inputs.userId,
      );
    }

    return participant;
  },
};
