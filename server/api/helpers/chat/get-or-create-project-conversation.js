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
  },

  async fn(inputs) {
    return sails.getDatastore().transaction(async (db) => {
      await sails
        .sendNativeQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `chat-project-group:${inputs.project.id}`,
        ])
        .usingConnection(db);

      let conversation = await ChatConversation.findOne({
        projectId: inputs.project.id,
        type: ChatConversation.Types.PROJECT_GROUP,
      }).usingConnection(db);

      if (!conversation) {
        conversation = await ChatConversation.create({
          projectId: inputs.project.id,
          type: ChatConversation.Types.PROJECT_GROUP,
          createdByUserId: inputs.user.id,
        })
          .fetch()
          .usingConnection(db);
      }

      await sails
        .sendNativeQuery(
          `INSERT INTO chat_participant (conversation_id, user_id, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [conversation.id, inputs.user.id, new Date().toISOString()],
        )
        .usingConnection(db);

      const participant = await ChatParticipant.findOne({
        conversationId: conversation.id,
        userId: inputs.user.id,
      }).usingConnection(db);

      return { conversation, participants: [participant] };
    });
  },
};
