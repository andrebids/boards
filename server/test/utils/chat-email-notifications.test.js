const { expect } = require('chai');

const scheduleNotification = require('../../api/helpers/chat-email-notifications/schedule');
const {
  buildEmail,
  getTargets,
  makeMessagePreview,
} = require('../../utils/chat-email-notifications');

describe('Chat email notifications', () => {
  it('targets only explicitly mentioned recipients in group conversations', () => {
    const targets = getTargets(
      { type: 'projectGroup' },
      ['sender', 'mentioned', 'other', 'mentioned'],
      'sender',
      'Hello @[Catarina](mentioned) and @[Unknown](not-a-member)',
    );

    expect(targets).to.deep.equal([
      {
        userId: 'mentioned',
        kind: 'mention',
      },
    ]);
  });

  it('targets every other participant in direct conversations', () => {
    const targets = getTargets(
      { type: 'projectDirect' },
      ['sender', 'recipient'],
      'sender',
      'Hello',
    );

    expect(targets).to.deep.equal([
      {
        userId: 'recipient',
        kind: 'direct',
      },
    ]);
  });

  it('formats and truncates message previews', () => {
    expect(makeMessagePreview('', 'Attachment')).to.equal('Attachment');
    expect(makeMessagePreview('Hello @[Catarina](123)', 'Attachment')).to.equal('Hello @Catarina');
    expect(makeMessagePreview('x'.repeat(600), 'Attachment')).to.have.length(500);
  });

  it('builds a localized, escaped email with a direct chat link', () => {
    const email = buildEmail({
      baseUrl: 'https://boards.example.test',
      conversation: {
        id: 'conversation-1',
        title: '<Design>',
        type: 'projectGroup',
      },
      messages: [
        {
          id: 'message-1',
          kind: 'mention',
          sender: {
            name: '<André>',
          },
          text: 'Bonjour @[Aurélien](recipient) <script>',
        },
      ],
      project: {
        id: 'project-1',
        name: '<2027 Collections>',
      },
      recipient: {
        language: 'fr-FR',
        name: 'Aurélien',
      },
    });

    expect(email.subject).to.equal('Blachere Boards: Mention non lue dans le chat — <Design>');
    expect(email.text).to.include('Bonjour Aurélien');
    expect(email.text).to.include('Bonjour @Aurélien <script>');
    expect(email.url).to.equal(
      'https://boards.example.test/projects/project-1?chatConversation=conversation-1&chatMessage=message-1',
    );
    expect(email.html).to.include('&lt;André&gt;');
    expect(email.html).to.include('&lt;script&gt;');
    expect(email.html).not.to.include('<script>');
  });

  it('persists eligible notifications in the caller transaction', async () => {
    const previousSails = global.sails;
    const queryCalls = [];
    global.sails = {
      config: {
        custom: {
          chatEmailNotificationDelaySeconds: 3600,
          chatEmailNotificationsEnabled: true,
        },
      },
      sendNativeQuery: (sql, values) => {
        queryCalls.push({ sql, values });
        return {
          usingConnection: async (connection) => {
            expect(connection).to.equal('transaction');
            return { rowCount: 1 };
          },
        };
      },
    };

    try {
      const count = await scheduleNotification.fn({
        message: {
          id: 'message-1',
          text: 'Hello @[Catarina](recipient)',
        },
        conversation: {
          id: 'conversation-1',
          type: 'projectGroup',
        },
        recipientUserIds: ['sender', 'recipient'],
        senderUserId: 'sender',
        db: 'transaction',
      });

      expect(count).to.equal(1);
      expect(queryCalls).to.have.length(1);
      expect(queryCalls[0].sql).to.include('LEFT JOIN chat_participant participant');
      expect(queryCalls[0].sql).to.include('participant.id IS NULL');
      expect(queryCalls[0].sql).to.include('ON CONFLICT (message_id, user_id) DO NOTHING');
      expect(queryCalls[0].values).to.deep.equal([
        'message-1',
        'conversation-1',
        ['recipient'],
        ['mention'],
        3600,
      ]);
    } finally {
      if (previousSails === undefined) {
        delete global.sails;
      } else {
        global.sails = previousSails;
      }
    }
  });
});
