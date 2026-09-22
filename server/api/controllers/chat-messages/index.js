/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { withConversationLock, joinConversationRoom } = require('../../../utils/chat-lifecycle');

const Errors = {
  CONVERSATION_NOT_FOUND: { conversationNotFound: 'Conversation not found' },
};

module.exports = {
  inputs: {
    conversationId: {
      ...idInput,
      required: true,
    },
    beforeId: idInput,
    afterId: idInput,
    aroundId: idInput,
    limit: {
      type: 'number',
      min: 1,
      max: 100,
      defaultsTo: 50,
    },
    subscribe: {
      type: 'boolean',
      defaultsTo: true,
    },
  },

  exits: {
    conversationNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    return withConversationLock(inputs.conversationId, async () => {
      const { currentUser } = this.req;
      const conversation = await ChatConversation.qm.getOneById(inputs.conversationId);
      const access =
        conversation &&
        (await sails.helpers.chat.getConversationAccess.with({
          conversation,
          user: currentUser,
          ensureParticipant: conversation.type === ChatConversation.Types.PROJECT_GROUP,
        }));

      if (!access) {
        if (this.req.isSocket) {
          sails.sockets.leave(this.req, `chatConversation:${inputs.conversationId}`);
        }
        throw Errors.CONVERSATION_NOT_FOUND;
      }

      if (inputs.subscribe && this.req.isSocket && !access.isHistorical) {
        await joinConversationRoom(this.req, conversation.id);
      }

      let messages;
      let meta;
      const minimumId = access.participant && access.participant.historyClearedThroughMessageId;
      const maximumId = access.isHistorical
        ? access.participant.historyVisibleThroughMessageId
        : undefined;
      if (access.isHistorical && !maximumId) {
        return {
          items: [],
          included: { users: [] },
          meta: { hasMore: false, hasMoreBefore: false, hasMoreAfter: false },
        };
      }
      if (inputs.aroundId) {
        const window = await ChatMessage.qm.getWindowAroundId(
          conversation.id,
          inputs.aroundId,
          minimumId,
          Math.floor(inputs.limit / 2),
          Math.ceil(inputs.limit / 2),
          maximumId,
          access.isHistorical ? access.participant.leftAt : undefined,
        );
        if (!window) {
          throw Errors.CONVERSATION_NOT_FOUND;
        }
        messages = window.messages;
        meta = {
          hasMore: window.hasMoreBefore,
          hasMoreBefore: window.hasMoreBefore,
          hasMoreAfter: window.hasMoreAfter,
          anchorMessageId: inputs.aroundId,
        };
      } else {
        const records = await ChatMessage.qm.getByConversationId(conversation.id, {
          beforeId: inputs.beforeId,
          afterId: inputs.afterId,
          minimumId,
          maximumId,
          editedBefore: access.isHistorical ? access.participant.leftAt : undefined,
          limit: inputs.limit + 1,
        });
        const hasMore = records.length > inputs.limit;
        messages = records.slice(0, inputs.limit);
        meta = { hasMore };
      }
      messages = messages.filter((message) =>
        sails.helpers.chat.isMessageVisible(message, access.participant),
      );
      const extrasByMessageId = await sails.helpers.chat.getMessageExtras(
        messages.map((message) => message.id),
        currentUser.id,
        access.participant,
      );
      const userIds = sails.helpers.utils.mapRecords(messages, 'userId', true, true);
      const users = await User.qm.getByIds(userIds);

      return {
        items: messages.map((message) =>
          sails.helpers.chat.presentMessage({ ...message, ...extrasByMessageId[message.id] }),
        ),
        included: {
          users: sails.helpers.users.presentMany(users, currentUser),
        },
        meta,
      };
    });
  },
};
