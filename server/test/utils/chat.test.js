const { expect } = require('chai');
const lodash = require('lodash');

const ChatConversationDefinition = require('../../api/models/ChatConversation');
const ChatMessageDefinition = require('../../api/models/ChatMessage');
const ChatParticipantDefinition = require('../../api/models/ChatParticipant');
const ProjectDefinition = require('../../api/models/Project');
const buildDirectKey = require('../../api/helpers/chat/build-direct-key');
const getProjectMemberUserIds = require('../../api/helpers/chat/get-project-member-user-ids');
const getConversationRecipientUserIds = require('../../api/helpers/chat/get-conversation-recipient-user-ids');
const getMessageExtras = require('../../api/helpers/chat/get-message-extras');
const createMessage = require('../../api/helpers/chat/create-message');
const markAsRead = require('../../api/helpers/chat/mark-as-read');
const presentMessage = require('../../api/helpers/chat/present-message');
const reconcileProjectRooms = require('../../api/helpers/chat/reconcile-project-rooms');
const deleteBoard = require('../../api/helpers/boards/delete-one');
const chatConversationsIndex = require('../../api/controllers/chat-conversations/index');
const ChatMessageQueryMethods = require('../../api/hooks/query-methods/models/ChatMessage');
const ChatParticipantQueryMethods = require('../../api/hooks/query-methods/models/ChatParticipant');
const ProjectQueryMethods = require('../../api/hooks/query-methods/models/Project');

describe('Chat domain', () => {
  it('uses stable API enum values', () => {
    expect(ChatConversationDefinition.Types).to.deep.equal({
      PROJECT_GROUP: 'projectGroup',
      PROJECT_DIRECT: 'projectDirect',
      PROJECT_CUSTOM_GROUP: 'projectCustomGroup',
    });
    expect(ProjectDefinition.ChatModes).to.deep.equal({
      DISABLED: 'disabled',
      MANAGERS: 'managers',
      ALL_PROJECT_MEMBERS: 'allProjectMembers',
    });
    expect(ProjectDefinition.attributes.chatMode.defaultsTo).to.equal(
      ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS,
    );
  });

  it('maps chat models to the migrated table names', () => {
    expect(ChatConversationDefinition.tableName).to.equal('chat_conversation');
    expect(ChatMessageDefinition.tableName).to.equal('chat_message');
    expect(ChatParticipantDefinition.tableName).to.equal('chat_participant');
    expect(ChatMessageDefinition.attributes.clientMessageId.columnName).to.equal(
      'client_message_id',
    );
  });

  it('creates projects with chat available to all project members by default', async () => {
    const previousGlobals = {
      sails: global.sails,
      Project: global.Project,
      ProjectManager: global.ProjectManager,
    };
    let createdProjectValues;

    global.Project = {
      ChatModes: ProjectDefinition.ChatModes,
      Types: ProjectDefinition.Types,
      create: (values) => {
        createdProjectValues = values;

        return {
          fetch: () => ({
            usingConnection: async () => ({ id: 'project', ...values }),
          }),
        };
      },
    };
    global.ProjectManager = {
      create: (values) => ({
        fetch: () => ({
          usingConnection: async () => ({ id: 'manager', ...values }),
        }),
      }),
    };
    global.sails = {
      getDatastore: () => ({
        transaction: (callback) => callback('connection'),
      }),
    };

    try {
      const { project } = await ProjectQueryMethods.createOne(
        {
          type: ProjectDefinition.Types.SHARED,
          name: 'Project',
        },
        { user: { id: 'user' } },
      );

      expect(createdProjectValues.chatMode).to.equal(
        ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS,
      );
      expect(project.chatMode).to.equal(ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('includes administrators with full visibility in shared-project chat', async () => {
    const previousGlobals = {
      sails: global.sails,
      Project: global.Project,
      _: global._,
    };

    global.Project = { ChatModes: ProjectDefinition.ChatModes };
    global._ = lodash;
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: ({ record }) => ({
              getProjectManagerUserIds: async () => ['manager', 'shared'],
              getBoardMemberUserIdsForWholeProject: async () => ['member', 'shared'],
              getUserIdsWithFullProjectVisibility: async () =>
                record.ownerProjectManagerId ? ['shared'] : ['admin', 'shared'],
            }),
          },
        },
      },
    };

    try {
      expect(
        await getProjectMemberUserIds.fn({
          project: {
            chatMode: ProjectDefinition.ChatModes.MANAGERS,
            ownerProjectManagerId: null,
          },
        }),
      ).to.deep.equal(['manager', 'shared']);
      expect(
        await getProjectMemberUserIds.fn({
          project: {
            chatMode: ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS,
            ownerProjectManagerId: null,
          },
        }),
      ).to.deep.equal(['manager', 'shared', 'member', 'admin']);
      expect(
        await getProjectMemberUserIds.fn({
          project: {
            chatMode: ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS,
            ownerProjectManagerId: 'owner-manager',
          },
        }),
      ).to.deep.equal(['manager', 'shared', 'member']);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('revokes explicitly affected users even when the project has no conversations', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
      BoardMembership: global.BoardMembership,
      _: global._,
    };
    const broadcasts = [];

    global._ = lodash;
    global.ChatConversation = { qm: { getByProjectId: async () => [] } };
    global.ChatParticipant = { qm: { getByConversationIds: async () => [] } };
    global.BoardMembership = { qm: { getByProjectId: async () => [] } };
    global.sails = {
      helpers: {
        chat: { getProjectMemberUserIds: async () => ['still-authorized'] },
        projects: {
          makeScoper: {
            with: () => ({ getProjectManagerUserIds: async () => [] }),
          },
        },
        utils: {
          mapRecords: (records, attribute = 'id') => records.map((record) => record[attribute]),
        },
      },
      sockets: { broadcast: (...args) => broadcasts.push(args) },
    };

    try {
      const result = await reconcileProjectRooms.fn({
        project: { id: 'project-1' },
        affectedUserIds: ['removed', 'still-authorized'],
      });

      expect(result).to.deep.equal({
        revokedUserIds: ['removed'],
        conversationIds: [],
      });
      expect(broadcasts).to.deep.equal([
        ['@user:removed', 'chatProjectAccessRevoke', { item: { projectId: 'project-1' } }],
      ]);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('removes revoked users from every chat room before broadcasting the revocation', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
      BoardMembership: global.BoardMembership,
      _: global._,
    };
    const events = [];
    let destroyCriteria;
    const conversations = [
      { id: '10', type: 'projectGroup' },
      { id: '20', type: 'projectCustomGroup' },
    ];

    global._ = lodash;
    global.ChatConversation = {
      Types: {
        PROJECT_GROUP: 'projectGroup',
        PROJECT_CUSTOM_GROUP: 'projectCustomGroup',
      },
      qm: { getByProjectId: async () => conversations },
    };
    global.ChatParticipant = {
      qm: {
        getByConversationIds: async () => [
          { conversationId: '10', userId: 'removed' },
          { conversationId: '20', userId: 'removed' },
        ],
      },
      destroy: async (criteria) => {
        destroyCriteria = criteria;
      },
    };
    global.BoardMembership = { qm: { getByProjectId: async () => [] } };
    global.sails = {
      helpers: {
        chat: { getProjectMemberUserIds: async () => [] },
        projects: {
          makeScoper: {
            with: () => ({ getProjectManagerUserIds: async () => [] }),
          },
        },
        utils: {
          mapRecords: (records, attribute = 'id') => records.map((record) => record[attribute]),
        },
      },
      sockets: {
        removeRoomMembersFromRooms: (sourceRoom, destinationRoom, callback) => {
          setImmediate(() => {
            events.push(['leave', sourceRoom, destinationRoom]);
            callback();
          });
        },
        broadcast: (...args) => events.push(['broadcast', ...args]),
      },
    };

    try {
      await reconcileProjectRooms.fn({
        project: { id: 'project-1' },
        affectedUserIds: ['removed'],
      });

      expect(destroyCriteria).to.deep.equal({
        conversationId: ['20'],
        userId: ['removed'],
      });
      expect(events.slice(0, 2)).to.have.deep.members([
        ['leave', '@user:removed', 'chatConversation:10'],
        ['leave', '@user:removed', 'chatConversation:20'],
      ]);
      expect(events[2][0]).to.equal('broadcast');
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('only returns currently authorized conversation recipients', async () => {
    const previousGlobals = {
      sails: global.sails,
      Project: global.Project,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
    };

    global.Project = {
      ChatModes: ProjectDefinition.ChatModes,
      qm: {
        getOneById: async () => ({
          id: 'project-1',
          chatMode: ProjectDefinition.ChatModes.ALL_PROJECT_MEMBERS,
        }),
      },
    };
    global.ChatConversation = {
      Types: {
        PROJECT_GROUP: 'projectGroup',
        PROJECT_DIRECT: 'projectDirect',
        PROJECT_CUSTOM_GROUP: 'projectCustomGroup',
      },
    };
    global.ChatParticipant = {
      qm: {
        getByConversationId: async () => [{ userId: 'authorized' }, { userId: 'removed' }],
      },
    };
    global.sails = {
      helpers: {
        chat: { getProjectMemberUserIds: async () => ['authorized'] },
        utils: {
          mapRecords: (records, attribute = 'id') => records.map((record) => record[attribute]),
        },
      },
    };

    try {
      expect(
        await getConversationRecipientUserIds.fn({
          conversation: {
            id: '10',
            projectId: 'project-1',
            type: 'projectDirect',
          },
        }),
      ).to.deep.equal(['authorized']);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('reconciles chat access for every membership removed with a board', async () => {
    const previousGlobals = {
      sails: global.sails,
      Board: global.Board,
    };
    let reconcileInputs;
    const board = { id: 'board-1', projectId: 'project-1' };
    const boardMemberships = [
      { id: 'membership-1', userId: 'user-1' },
      { id: 'membership-2', userId: 'user-2' },
      { id: 'membership-3', userId: 'user-1' },
    ];

    global.Board = { qm: { deleteOne: async () => board } };
    global.sails = {
      helpers: {
        boards: { deleteRelated: async () => ({ boardMemberships }) },
        chat: {
          reconcileProjectRooms: {
            with: async (values) => {
              reconcileInputs = values;
            },
          },
        },
        projects: {
          makeScoper: {
            with: () => ({
              getBoardRelatedUserIds: async () => ['user-1', 'user-2'],
            }),
          },
        },
        utils: {
          mapRecords: (records, attribute = 'id', unique = false) => {
            const values = records.map((record) => record[attribute]);
            return unique ? [...new Set(values)] : values;
          },
          sendWebhooks: { with: () => {} },
        },
      },
      sockets: {
        broadcast: () => {},
        removeRoomMembersFromRooms: () => {},
      },
    };

    try {
      await deleteBoard.fn({
        record: board,
        project: { id: 'project-1' },
        actorUser: { id: 'manager' },
      });

      expect(reconcileInputs).to.deep.equal({
        project: { id: 'project-1' },
        affectedUserIds: ['user-1', 'user-2'],
      });
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('builds the same direct key independent of participant order', () => {
    expect(buildDirectKey.fn({ userId: '9007199254740992', otherUserId: '4' })).to.equal(
      '4:9007199254740992',
    );
    expect(buildDirectKey.fn({ userId: '4', otherUserId: '9007199254740992' })).to.equal(
      '4:9007199254740992',
    );
  });

  it('never exposes the text of a logically deleted message', () => {
    const message = {
      id: '1',
      text: '<private content>',
      deletedAt: '2026-07-13T12:00:00.000Z',
    };

    expect(presentMessage.fn({ message })).to.deep.equal({
      ...message,
      text: null,
      attachments: [],
      reactions: [],
      linkPreviews: [],
      replyTo: null,
    });
    expect(message.text).to.equal('<private content>');
  });

  it('advances read cursors with a conditional database update', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatParticipant: global.ChatParticipant,
    };
    let capturedQuery;
    let capturedValues;

    global.sails = {
      sendNativeQuery: async (query, values) => {
        capturedQuery = query;
        capturedValues = values;
      },
    };
    global.ChatParticipant = {
      findOne: async (id) => ({ id, lastReadMessageId: '42' }),
    };

    try {
      const participant = await ChatParticipantQueryMethods.advanceReadCursor(
        '7',
        '42',
        '2026-07-13T12:00:00.000Z',
      );

      expect(capturedQuery).to.include('$2 > COALESCE(last_read_message_id, 0)');
      expect(capturedValues).to.deep.equal(['7', '42', '2026-07-13T12:00:00.000Z']);
      expect(participant.lastReadMessageId).to.equal('42');
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('returns and broadcasts the same canonical read state', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatMessage: global.ChatMessage,
      ChatParticipant: global.ChatParticipant,
    };
    const request = { id: 'request-1' };
    const broadcasts = [];

    global.ChatMessage = {
      qm: {
        getLastByConversationId: async () => ({
          id: '42',
          conversationId: '10',
        }),
      },
    };
    global.ChatParticipant = {
      qm: {
        advanceReadCursor: async () => ({
          id: '7',
          conversationId: '10',
          userId: '3',
          lastReadMessageId: '42',
          lastReadAt: '2026-07-13T12:00:00.000Z',
        }),
      },
    };
    global.sails = {
      helpers: {
        chat: {
          ensureParticipant: async () => ({ id: '7' }),
          getUnreadCounts: async () => ({ 10: 0 }),
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };

    try {
      const result = await markAsRead.fn({
        conversation: { id: '10' },
        user: { id: '3' },
        request,
      });

      expect(result).to.deep.equal({
        conversationId: '10',
        userId: '3',
        lastReadMessageId: '42',
        lastReadAt: '2026-07-13T12:00:00.000Z',
        unreadCount: 0,
      });
      expect(broadcasts).to.have.length(2);
      expect(broadcasts[0]).to.deep.equal([
        'chatConversation:10',
        'chatConversationRead',
        { item: result },
        request,
      ]);
      expect(broadcasts[1]).to.deep.equal(['@user:3', 'chatConversationRead', { item: result }]);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('groups message extras without repeated per-message filtering', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatMessage: global.ChatMessage,
      ChatMessageAttachment: global.ChatMessageAttachment,
      ChatMessageReaction: global.ChatMessageReaction,
      ChatMessageLinkPreview: global.ChatMessageLinkPreview,
      ChatLinkPreview: global.ChatLinkPreview,
    };

    global.sails = {
      helpers: {
        chatMessageAttachments: {
          presentOne: (attachment) => attachment,
        },
      },
    };
    global.ChatMessage = {
      find: async () => [
        { id: '1', replyToMessageId: null },
        { id: '2', replyToMessageId: null },
      ],
    };
    global.ChatMessageAttachment = {
      find: () => ({
        sort: async () => [
          { id: '10', messageId: '1' },
          { id: '11', messageId: '2' },
        ],
      }),
    };
    global.ChatMessageLinkPreview = {
      qm: { getByMessageIds: async () => [] },
    };
    global.ChatLinkPreview = {
      Statuses: { READY: 'ready' },
      qm: { getByIds: async () => [] },
    };
    global.ChatMessageReaction = {
      find: () => ({
        sort: async () => [
          { id: '20', messageId: '1', emoji: '👍', userId: '3' },
          { id: '21', messageId: '1', emoji: '👍', userId: '4' },
          { id: '22', messageId: '2', emoji: '🎉', userId: '3' },
        ],
      }),
    };

    try {
      const extras = await getMessageExtras.fn({ messageIds: ['1', '2'] });

      expect(extras['1'].attachments).to.have.length(1);
      expect(extras['1'].reactions).to.deep.equal([{ emoji: '👍', userIds: ['3', '4'] }]);
      expect(extras['2'].reactions).to.deep.equal([{ emoji: '🎉', userIds: ['3'] }]);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('returns an idempotent message retry without broadcasting it again', async () => {
    const previousGlobals = {
      sails: global.sails,
      ChatConversation: global.ChatConversation,
      ChatMessage: global.ChatMessage,
    };
    const existingMessage = {
      id: '50',
      conversationId: '10',
      userId: '3',
      clientMessageId: 'client-1',
      text: 'hello',
    };
    let broadcastCount = 0;
    let createCount = 0;

    global.sails = {
      getDatastore: () => ({ transaction: async (callback) => callback({}) }),
      sendNativeQuery: () => ({ usingConnection: async () => ({ rows: [] }) }),
      sockets: {
        broadcast: () => {
          broadcastCount += 1;
        },
      },
    };
    global.ChatConversation = {
      Types: { PROJECT_GROUP: 'projectGroup' },
    };
    global.ChatMessage = {
      findOne: () => ({ usingConnection: async () => existingMessage }),
      create: () => {
        createCount += 1;
        throw new Error('create must not run for an idempotent retry');
      },
    };

    try {
      const result = await createMessage.fn({
        conversation: { id: '10', type: 'projectGroup' },
        project: { id: '1' },
        participantUserIds: ['3'],
        memberUserIds: ['3'],
        text: 'hello',
        clientMessageId: 'client-1',
        user: { id: '3' },
      });

      expect(result).to.equal(existingMessage);
      expect(createCount).to.equal(0);
      expect(broadcastCount).to.equal(0);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });

  it('gets the last message for many conversations in one query', async () => {
    const previousSails = global.sails;
    let capturedQuery;
    let capturedValues;

    global.sails = {
      sendNativeQuery: async (query, values) => {
        capturedQuery = query;
        capturedValues = values;
        return { rows: [{ id: '20', conversationId: '2' }] };
      },
    };

    try {
      expect(await ChatMessageQueryMethods.getLastByConversationIds([])).to.deep.equal([]);
      const messages = await ChatMessageQueryMethods.getLastByConversationIds(['1', '2']);

      expect(capturedQuery).to.include('DISTINCT ON (conversation_id)');
      expect(capturedValues).to.deep.equal([['1', '2']]);
      expect(messages).to.deep.equal([{ id: '20', conversationId: '2' }]);
    } finally {
      if (previousSails === undefined) {
        delete global.sails;
      } else {
        global.sails = previousSails;
      }
    }
  });

  it('lists conversations with batched participants and last messages', async () => {
    const previousGlobals = {
      sails: global.sails,
      Project: global.Project,
      ChatConversation: global.ChatConversation,
      ChatParticipant: global.ChatParticipant,
      ChatMessage: global.ChatMessage,
      User: global.User,
      _: global._,
    };
    const currentUser = { id: '1' };
    const projectConversations = [
      { id: '10', type: 'projectGroup' },
      { id: '20', type: 'projectDirect' },
      { id: '30', type: 'projectDirect' },
      { id: '40', type: 'unsupported' },
    ];
    const existingParticipants = [
      { id: '100', conversationId: '10', userId: '9' },
      { id: '200', conversationId: '20', userId: '1' },
      { id: '201', conversationId: '20', userId: '8' },
      { id: '300', conversationId: '30', userId: '4' },
      { id: '301', conversationId: '30', userId: '5' },
    ];
    let participantBatchCount = 0;
    let lastMessageBatchCount = 0;
    let lastMessageConversationIds;
    let ensureParticipantCount = 0;

    const mapRecords = (records, attribute = 'id', unique = false, withoutNull = false) => {
      let values = records.map((record) => record[attribute]);
      if (unique) {
        values = [...new Set(values)];
      }
      if (withoutNull) {
        values = values.filter((value) => value !== null);
      }
      return values;
    };

    global._ = lodash;
    global.Project = {
      qm: { getOneById: async () => ({ id: 'project-1' }) },
    };
    global.ChatConversation = {
      Types: {
        PROJECT_GROUP: 'projectGroup',
        PROJECT_DIRECT: 'projectDirect',
      },
      qm: { getByProjectId: async () => projectConversations },
    };
    global.ChatParticipant = {
      qm: {
        getByConversationIds: async () => {
          participantBatchCount += 1;
          return existingParticipants;
        },
      },
    };
    global.ChatMessage = {
      qm: {
        getLastByConversationIds: async (conversationIds) => {
          lastMessageBatchCount += 1;
          lastMessageConversationIds = conversationIds;
          return [
            { id: '1000', conversationId: '10', userId: '1', text: 'group' },
            { id: '2000', conversationId: '20', userId: '8', text: 'direct' },
          ];
        },
      },
    };
    global.User = {
      qm: { getByIds: async (userIds) => userIds.map((id) => ({ id })) },
    };
    global.sails = {
      helpers: {
        chat: {
          getProjectMemberUserIds: async () => ['1', '4', '5'],
          ensureParticipant: async (conversationId, userId) => {
            ensureParticipantCount += 1;
            return { id: '101', conversationId, userId };
          },
          getUnreadCounts: async () => ({ 10: 2, 20: 3 }),
          presentMessage: (message) => presentMessage.fn({ message }),
        },
        users: {
          presentMany: (users) => users,
        },
        utils: { mapRecords },
      },
    };

    try {
      const result = await chatConversationsIndex.fn.call(
        { req: { currentUser } },
        { projectId: 'project-1' },
      );

      expect(participantBatchCount).to.equal(1);
      expect(lastMessageBatchCount).to.equal(1);
      expect(lastMessageConversationIds).to.deep.equal(['10', '20']);
      expect(ensureParticipantCount).to.equal(1);
      expect(result.items.map(({ id }) => id)).to.deep.equal(['10', '20']);
      expect(result.items.map(({ isBlocked }) => isBlocked)).to.deep.equal([false, true]);
      expect(result.items.map(({ unreadCount }) => unreadCount)).to.deep.equal([2, 3]);
      expect(result.included.chatParticipants.map(({ id }) => id)).to.have.members([
        '101',
        '200',
        '201',
      ]);
    } finally {
      Object.entries(previousGlobals).forEach(([name, value]) => {
        if (value === undefined) {
          delete global[name];
        } else {
          global[name] = value;
        }
      });
    }
  });
});
