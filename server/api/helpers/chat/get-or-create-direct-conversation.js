/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    project: {
      type: 'ref',
      required: true,
    },
    user: {
      type: 'ref',
      required: true,
    },
    otherUser: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const directKey = sails.helpers.chat.buildDirectKey(inputs.user.id, inputs.otherUser.id);
    const userIds = directKey.split(':');

    return sails.getDatastore().transaction(async (db) => {
      await sails
        .sendNativeQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `chat-project-direct:${inputs.project.id}:${directKey}`,
        ])
        .usingConnection(db);

      let conversation = await ChatConversation.findOne({
        projectId: inputs.project.id,
        type: ChatConversation.Types.PROJECT_DIRECT,
        directKey,
      }).usingConnection(db);

      if (!conversation) {
        conversation = await ChatConversation.create({
          projectId: inputs.project.id,
          type: ChatConversation.Types.PROJECT_DIRECT,
          directKey,
          createdByUserId: inputs.user.id,
        })
          .fetch()
          .usingConnection(db);
      }

      const now = new Date().toISOString();
      await sails
        .sendNativeQuery(
          `INSERT INTO chat_participant (conversation_id, user_id, created_at)
           VALUES ($1, $2, $3), ($1, $4, $3)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [conversation.id, userIds[0], now, userIds[1]],
        )
        .usingConnection(db);

      const participants = await ChatParticipant.find({
        conversationId: conversation.id,
      })
        .sort('id')
        .usingConnection(db);

      if (participants.length !== 2) {
        throw new Error('A direct chat conversation must have exactly two participants');
      }

      return { conversation, participants };
    });
  },
};
