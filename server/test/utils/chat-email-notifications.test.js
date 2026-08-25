const fs = require('fs');
const path = require('path');

const { expect } = require('chai');
const Handlebars = require('handlebars');
const juice = require('juice');

const scheduleNotification = require('../../api/helpers/chat-email-notifications/schedule');
const {
  buildEmail,
  getTargets,
  makeMessagePreview,
} = require('../../utils/chat-email-notifications');

describe('Chat email notifications', () => {
  const renderSharedEmailTemplate = (templateData) => {
    const templatesDirectory = path.join(__dirname, '../../views/email-templates');
    const partialsDirectory = path.join(templatesDirectory, 'partials');

    fs.readdirSync(partialsDirectory)
      .filter((fileName) => fileName.endsWith('.hbs'))
      .forEach((fileName) => {
        Handlebars.registerPartial(
          path.basename(fileName, '.hbs'),
          fs.readFileSync(path.join(partialsDirectory, fileName), 'utf8'),
        );
      });

    const masterTemplate = Handlebars.compile(
      fs.readFileSync(path.join(templatesDirectory, 'master.hbs'), 'utf8'),
    );

    return juice(masterTemplate(templateData));
  };

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

  it('builds localized data for the shared email template with a direct chat link', () => {
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
    expect(email.templateData).to.include({
      email_language: 'fr-FR',
      email_copyright: `© ${new Date().getFullYear()} Blachere boards.`,
      is_chat_notification: true,
      notification_title: 'Mention non lue dans le chat',
      project_name: '<2027 Collections>',
      chat_conversation_name: '<Design>',
      card_url:
        'https://boards.example.test/projects/project-1?chatConversation=conversation-1&chatMessage=message-1',
    });
    expect(email.templateData.chat_messages).to.deep.equal([
      {
        preview: 'Bonjour @Aurélien <script>',
        sender_name: '<André>',
      },
    ]);
    expect(email).not.to.have.property('html');
  });

  it('renders chat content through the shared email layout and escapes dynamic values', () => {
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
          sender: { name: '<André>' },
          text: 'Hello <script>alert(1)</script>',
        },
      ],
      project: { id: 'project-1', name: '<2027 Collections>' },
      recipient: { language: 'en-US', name: '<Aurélien>' },
    });

    const html = renderSharedEmailTemplate(email.templateData);

    expect(html).to.include('Blachere boards');
    expect(html).to.include(`© ${new Date().getFullYear()} Blachere boards.`);
    expect(html).to.match(/background-color:\s*#171a21/);
    expect(html).to.include('OPEN CONVERSATION');
    expect(html).to.include('&lt;André&gt;');
    expect(html).to.include('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.to.include('<script>alert(1)</script>');
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
