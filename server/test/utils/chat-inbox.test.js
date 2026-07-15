const { expect } = require('chai');
const lodash = require('lodash');

const ChatConversationDefinition = require('../../api/models/ChatConversation');
const ChatParticipantDefinition = require('../../api/models/ChatParticipant');
const getInbox = require('../../api/helpers/chat/get-inbox');
const getUnreadDetails = require('../../api/helpers/chat/get-unread-details');
const chatInboxRead = require('../../api/controllers/chat-inbox/read');

const restoreGlobals = (previousGlobals) => {
  Object.entries(previousGlobals).forEach(([name, value]) => {
    if (value === undefined) {
      delete global[name];
    } else {
      global[name] = value;
    }
  });
};

const mapRecords = (records, attribute = 'id', unique = false, withoutNull = false) => {
  let values = records.map((record) => record[attribute]);
  if (unique) {
    values = [...new Set(values)];
  }
  if (withoutNull) {
    values = values.filter((value) => value !== null && value !== undefined);
  }
  return values;
};

describe('Chat inbox', () => {
  it('returns authorized conversations from multiple projects with global totals', async () => {
    const previousGlobals = {
      sails: global.sails,
      User: global.User,
      Project: global.Project,
      Board: global.Board,
      BoardMembership: global.BoardMembership,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
      ChatMessage: global.ChatMessage,
      _: global._,
    };
    const user = { id: '1', role: 'boardUser' };
    const projects = [
      { id: '10', name: 'Alpha', authorized: true },
      { id: '20', name: 'Beta', authorized: true },
      { id: '30', name: 'Disabled', authorized: false },
    ];
    const conversations = [
      {
        id: '100',
        projectId: '10',
        type: ChatConversationDefinition.Types.PROJECT_GROUP,
        lastMessageAt: '2026-07-15T12:00:00.000Z',
      },
      {
        id: '200',
        projectId: '20',
        type: ChatConversationDefinition.Types.PROJECT_DIRECT,
        lastMessageAt: '2026-07-15T11:00:00.000Z',
      },
      {
        id: '201',
        projectId: '20',
        type: ChatConversationDefinition.Types.PROJECT_DIRECT,
        lastMessageAt: '2026-07-15T10:00:00.000Z',
      },
    ];
    const participants = [
      { id: '1', conversationId: '200', userId: '1', notificationLevel: 'mentions' },
      { id: '2', conversationId: '200', userId: '2', notificationLevel: 'all' },
      { id: '3', conversationId: '201', userId: '3', notificationLevel: 'all' },
      { id: '4', conversationId: '201', userId: '4', notificationLevel: 'all' },
    ];
    let requestedProjectIds;

    global._ = lodash;
    global.User = {
      Roles: { ADMIN: 'admin' },
      qm: {
        getByIds: async (ids) =>
          ids.map((id) => ({ id, name: id === '2' ? 'Beatriz' : `User ${id}` })),
      },
    };
    global.Project = {
      qm: {
        getByIds: async () => projects,
        getShared: async () => [],
      },
    };
    global.BoardMembership = { qm: { getByUserId: async () => [] } };
    global.Board = { qm: { getByIds: async () => [] } };
    global.ChatConversation = {
      Types: ChatConversationDefinition.Types,
      qm: {
        getByProjectIds: async (projectIds) => {
          requestedProjectIds = projectIds;
          return conversations;
        },
      },
    };
    global.ChatParticipant = {
      NotificationLevels: ChatParticipantDefinition.NotificationLevels,
      isMuted: ChatParticipantDefinition.isMuted,
      qm: { getByConversationIds: async () => participants },
    };
    global.ChatMessage = {
      qm: {
        getLastByConversationIds: async () => [
          {
            id: '1000',
            conversationId: '100',
            userId: '5',
            text: 'Alpha update',
            createdAt: '2026-07-15T12:00:00.000Z',
          },
          {
            id: '2000',
            conversationId: '200',
            userId: '2',
            text: 'Beta update',
            createdAt: '2026-07-15T11:00:00.000Z',
          },
        ],
      },
    };
    global.sails = {
      helpers: {
        users: {
          getManagerProjectIds: async () => ['10', '20', '30'],
          presentMany: (users) => users,
        },
        chat: {
          getProjectMemberUserIds: async (project) => (project.authorized ? ['1'] : []),
          getUnreadDetails: async () => ({
            100: {
              unreadCount: 2,
              firstUnreadMessageId: '900',
              hasUnreadMention: true,
            },
            200: {
              unreadCount: 3,
              firstUnreadMessageId: '1900',
              hasUnreadMention: false,
            },
          }),
          presentMessage: (message) => message,
        },
        utils: { mapRecords },
      },
    };

    try {
      const result = await getInbox.fn({
        user,
        filter: 'unread',
        limit: 50,
      });

      expect(requestedProjectIds).to.deep.equal(['10', '20']);
      expect(result.items.map(({ conversationId }) => conversationId)).to.deep.equal([
        '100',
        '200',
      ]);
      expect(result.items[1]).to.include({
        projectName: 'Beta',
        title: 'Beatriz',
        avatarUserId: '2',
        unreadCount: 3,
        notificationLevel: 'mentions',
      });
      expect(result.meta).to.deep.equal({
        hasChatAccess: true,
        unreadConversationTotal: 2,
        unreadMessageTotal: 5,
        unreadConversationTotalsByProjectId: { 10: 1, 20: 1 },
        hasMore: false,
        nextCursor: null,
      });
      expect(result.included.users.map(({ id }) => id)).to.have.members(['2', '5']);

      const firstPage = await getInbox.fn({
        user,
        filter: 'all',
        limit: 1,
      });
      expect(firstPage.items.map(({ conversationId }) => conversationId)).to.deep.equal(['100']);
      expect(firstPage.meta.hasMore).to.equal(true);
      expect(firstPage.meta.nextCursor).to.be.a('string');

      const secondPage = await getInbox.fn({
        user,
        filter: 'all',
        before: firstPage.meta.nextCursor,
        limit: 1,
      });
      expect(secondPage.items.map(({ conversationId }) => conversationId)).to.deep.equal(['200']);
      expect(secondPage.meta.hasMore).to.equal(false);

      const mentions = await getInbox.fn({
        user,
        filter: 'mentions',
        limit: 50,
      });
      expect(mentions.items.map(({ conversationId }) => conversationId)).to.deep.equal(['100']);
    } finally {
      restoreGlobals(previousGlobals);
    }
  });

  it('reports chat access even when the authorized projects have no conversations', async () => {
    const previousGlobals = {
      sails: global.sails,
      User: global.User,
      Project: global.Project,
      Board: global.Board,
      BoardMembership: global.BoardMembership,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
      ChatMessage: global.ChatMessage,
      _: global._,
    };
    global._ = lodash;
    global.User = { Roles: { ADMIN: 'admin' }, qm: { getByIds: async () => [] } };
    global.Project = {
      qm: {
        getByIds: async () => [{ id: '10', name: 'Empty' }],
        getShared: async () => [],
      },
    };
    global.BoardMembership = { qm: { getByUserId: async () => [] } };
    global.Board = { qm: { getByIds: async () => [] } };
    global.ChatConversation = {
      Types: ChatConversationDefinition.Types,
      qm: { getByProjectIds: async () => [] },
    };
    global.ChatParticipant = {
      NotificationLevels: ChatParticipantDefinition.NotificationLevels,
      isMuted: ChatParticipantDefinition.isMuted,
      qm: { getByConversationIds: async () => [] },
    };
    global.ChatMessage = { qm: { getLastByConversationIds: async () => [] } };
    global.sails = {
      helpers: {
        users: {
          getManagerProjectIds: async () => ['10'],
          presentMany: (users) => users,
        },
        chat: {
          getProjectMemberUserIds: async () => ['1'],
          getUnreadDetails: async () => ({}),
          presentMessage: (message) => message,
        },
        utils: { mapRecords },
      },
    };

    try {
      const result = await getInbox.fn({
        user: { id: '1', role: 'boardUser' },
        filter: 'all',
        limit: 50,
      });
      expect(result.items).to.deep.equal([]);
      expect(result.meta.hasChatAccess).to.equal(true);
      expect(result.meta.unreadConversationTotal).to.equal(0);
    } finally {
      restoreGlobals(previousGlobals);
    }
  });

  it('calculates unread details without own or deleted messages', async () => {
    const previousSails = global.sails;
    let query;
    let values;
    global.sails = {
      sendNativeQuery: async (capturedQuery, capturedValues) => {
        query = capturedQuery;
        values = capturedValues;
        return {
          rows: [
            {
              conversation_id: '10',
              unread_count: 2,
              first_unread_message_id: '40',
              has_unread_mention: true,
            },
          ],
        };
      },
    };

    try {
      const result = await getUnreadDetails.fn({ conversationIds: ['10'], userId: '3' });
      expect(query).to.include('m.user_id <> $1');
      expect(query).to.include('m.deleted_at IS NULL');
      expect(query).to.include('MIN(m.id)');
      expect(values).to.deep.equal(['3', ['10'], '](3)']);
      expect(result).to.deep.equal({
        10: {
          unreadCount: 2,
          firstUnreadMessageId: '40',
          hasUnreadMention: true,
        },
      });
    } finally {
      if (previousSails === undefined) {
        delete global.sails;
      } else {
        global.sails = previousSails;
      }
    }
  });

  it('marks a snapshot of multiple authorized conversations as read', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatConversation: global.ChatConversation,
      ChatMessage: global.ChatMessage,
    };
    const conversations = [
      { id: '10', projectId: '1' },
      { id: '20', projectId: '2' },
    ];
    const markInputs = [];
    global.ChatConversation = { qm: { getByIds: async () => conversations } };
    global.ChatMessage = {
      qm: {
        getLastByConversationIds: async () => [
          { id: '100', conversationId: '10' },
          { id: '200', conversationId: '20' },
        ],
      },
    };
    global.sails = {
      helpers: {
        chat: {
          getConversationAccess: { with: async () => ({ canWrite: true }) },
          markAsRead: {
            with: async (inputs) => {
              markInputs.push(inputs);
              return {
                conversationId: inputs.conversation.id,
                userId: inputs.user.id,
                lastReadMessageId: inputs.messageId,
                lastReadAt: '2026-07-15T12:00:00.000Z',
                unreadCount: 0,
              };
            },
          },
        },
      },
    };

    try {
      const req = { currentUser: { id: '3' } };
      const result = await chatInboxRead.fn.call({ req }, { conversationIds: ['10', '20'] });
      expect(markInputs.map(({ messageId }) => messageId)).to.deep.equal(['100', '200']);
      expect(result.items.map(({ conversationId }) => conversationId)).to.deep.equal(['10', '20']);
    } finally {
      restoreGlobals(previousGlobals);
    }
  });
});
