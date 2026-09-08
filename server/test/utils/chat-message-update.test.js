const { expect } = require('chai');

const controller = require('../../api/controllers/chat-messages/update');
const helper = require('../../api/helpers/chat/update-message');

describe('Chat message editing', () => {
  let previousGlobals;
  let message;
  let access;
  let writes;
  let events;
  let request;

  beforeEach(() => {
    previousGlobals = {
      sails: global.sails,
      ChatMessage: global.ChatMessage,
      ChatConversation: global.ChatConversation,
    };
    message = {
      id: '10',
      conversationId: '20',
      userId: '30',
      text: 'Original',
      createdAt: '2020-01-01T10:00:00.000Z',
      attachments: [{ id: '40' }],
    };
    access = { canWrite: true, memberUserIds: ['30', '31'], participants: [] };
    writes = [];
    events = [];
    request = { currentUser: { id: '30' } };
    const conversation = { id: '20', projectId: '50', type: 'projectGroup' };
    global.ChatMessage = {
      qm: {
        getOneById: async () => message,
        getLastByConversationId: async () => message,
        updateOneIfNotDeleted: async (id, values) => {
          writes.push({ id, values });
          return { ...message, ...values };
        },
      },
    };
    global.ChatConversation = {
      Types: { PROJECT_GROUP: 'projectGroup', PROJECT_DIRECT: 'projectDirect' },
      qm: { getOneById: async () => conversation },
    };
    global.sails = {
      helpers: {
        chat: {
          getConversationAccess: async () => access,
          updateMessage: { with: (inputs) => helper.fn(inputs) },
          getMessageExtras: async () => ({
            10: { attachments: message.attachments },
          }),
          getConversationRecipientUserIds: async () => ['30', '31'],
          presentMessage: (value) => value,
        },
        chatLinkPreviews: { syncMessageLinks: { with: async () => {} } },
      },
      sockets: { broadcast: (...args) => events.push(args) },
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) delete global[name];
      else global[name] = value;
    });
  });

  const update = (text = 'Corrected') => controller.fn.call({ req: request }, { id: '10', text });

  it('edits an old own message repeatedly, preserving attachments, time and order', async () => {
    const { item } = await update('  Corrected @[colleague](31)  ');
    expect(item.text).to.equal('Corrected @[colleague](31)');
    expect(item.createdAt).to.equal(message.createdAt);
    expect(item.id).to.equal(message.id);
    expect(item.attachments).to.deep.equal(message.attachments);
    expect(item.editedAt).to.be.a('string');
    expect(Object.keys(writes[0].values)).to.have.members(['text', 'editedAt']);
    message = item;
    await update('Second correction');
    expect(writes).to.have.length(2);
    expect(events.map((event) => event[1])).to.have.members([
      'chatMessageUpdate',
      'chatConversationUpdate',
      'chatConversationUpdate',
      'chatMessageUpdate',
      'chatConversationUpdate',
      'chatConversationUpdate',
    ]);
    // Edits only update existing messages/summaries: no new-message or notification event.
    expect(events[0][0]).to.equal('chatConversation:20');
    expect(events[0][3]).to.equal(request);
  });

  [
    [
      'another author',
      () => {
        message.userId = '31';
      },
      'notEnoughRights',
    ],
    [
      'blocked conversation',
      () => {
        access.canWrite = false;
      },
      'conversationBlocked',
    ],
    [
      'lost conversation access',
      () => {
        access = null;
      },
      'messageNotFound',
    ],
    [
      'deleted message',
      () => {
        message.deletedAt = '2026-01-01';
      },
      'messageAlreadyDeleted',
    ],
  ].forEach(([label, setup, errorKey]) => {
    it(`rejects ${label}`, async () => {
      setup();
      let error;
      try {
        await update();
      } catch (caught) {
        error = caught;
      }
      expect(error).to.have.property(errorKey);
      expect(writes).to.have.length(0);
    });
  });

  [
    ['   ', 'textMustNotBeEmpty'],
    ['@[outsider](99)', 'mentionNotAllowed'],
  ].forEach(([text, errorKey]) => {
    it(`rejects ${errorKey}`, async () => {
      let error;
      try {
        await update(text);
      } catch (caught) {
        error = caught;
      }
      expect(error).to.have.property(errorKey);
      expect(writes).to.have.length(0);
    });
  });
});
