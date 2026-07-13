/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    beforeId: idInput,
    limit: { type: 'number', min: 1, max: 100, defaultsTo: 50 },
  },
  exits: { projectNotFound: { responseType: 'notFound' } },

  async fn(inputs) {
    const project = await Project.qm.getOneById(inputs.projectId);
    const memberUserIds = project && (await sails.helpers.chat.getProjectMemberUserIds(project));
    if (!project || !memberUserIds.includes(this.req.currentUser.id)) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const records = await ChatSavedMessage.qm.getByUserIdAndProjectId(
      this.req.currentUser.id,
      project.id,
      { beforeId: inputs.beforeId, limit: inputs.limit + 1 },
    );
    const hasMore = records.length > inputs.limit;
    const savedMessages = records.slice(0, inputs.limit);
    const messages = await ChatMessage.find({
      id: savedMessages.map(({ messageId }) => messageId),
    });
    const conversations = await ChatConversation.find({
      id: [...new Set(messages.map(({ conversationId }) => conversationId))],
    });
    const accessResults = await Promise.all(
      conversations.map((conversation) =>
        sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser),
      ),
    );
    const accessibleConversationIds = conversations
      .filter((conversation, index) => accessResults[index])
      .map(({ id }) => id);
    const accessibleMessages = messages.filter(({ conversationId }) =>
      accessibleConversationIds.includes(conversationId),
    );
    const extras = await sails.helpers.chat.getMessageExtras(
      accessibleMessages.map(({ id }) => id),
      this.req.currentUser.id,
    );
    const users = await User.qm.getByIds(
      sails.helpers.utils.mapRecords(accessibleMessages, 'userId', true, true),
    );

    return {
      items: accessibleMessages.map((message) =>
        sails.helpers.chat.presentMessage({ ...message, ...extras[message.id] }),
      ),
      included: { users: sails.helpers.users.presentMany(users, this.req.currentUser) },
      meta: { hasMore },
    };
  },
};
