const { expect } = require('chai');
const webpush = require('web-push');

const processDueNotifications = require('../../api/helpers/web-push-notifications/process-due');
const scheduleNotification = require('../../api/helpers/web-push-notifications/schedule');
const subscriptionUtils = require('../../utils/web-push-subscription');
const {
  buildPayload,
  classifyWebPushError,
  getSendOptions,
  getTargets,
} = require('../../utils/web-push-notifications');

describe('Web Push chat notifications', () => {
  let previousSails;

  beforeEach(() => {
    previousSails = global.sails;
  });

  afterEach(() => {
    if (previousSails === undefined) {
      delete global.sails;
    } else {
      global.sails = previousSails;
    }
  });

  it('classifies every non-sender recipient and marks direct messages and mentions as essential', () => {
    expect(
      getTargets(
        { type: 'projectGroup' },
        ['sender', 'mentioned', 'other', 'mentioned'],
        'sender',
        'Hello @[Catarina](mentioned)',
      ),
    ).to.deep.equal([
      { userId: 'mentioned', kind: 'mention' },
      { userId: 'other', kind: 'general' },
    ]);

    expect(
      getTargets({ type: 'projectDirect' }, ['sender', 'recipient'], 'sender', 'Hello'),
    ).to.deep.equal([{ userId: 'recipient', kind: 'direct' }]);
  });

  it('builds a minimal localized payload and limits the visible preview to 160 characters', () => {
    const payload = buildPayload({
      conversation: { id: 'conversation-1', title: 'Design', type: 'projectGroup' },
      message: { id: 'message-1', text: `Olá @[André](user-1) ${'x'.repeat(200)}` },
      project: { id: 'project-1', name: 'Coleção' },
      recipient: { language: 'pt-PT' },
      sender: { name: 'Catarina' },
    });

    expect(payload).to.deep.include({
      version: 1,
      title: 'Catarina em Design',
      projectId: 'project-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      replyActionLabel: 'Responder',
    });
    expect(payload.body).to.have.length(160);
    expect(payload.body.startsWith('Olá @André')).to.equal(true);
    expect(payload.body.endsWith('…')).to.equal(true);
    expect(payload).not.to.have.any.keys('url', 'endpoint', 'token');
  });

  it('uses an attachment fallback only after an attachment exists', () => {
    const payload = buildPayload({
      conversation: { id: 'conversation-1', type: 'projectGroup' },
      message: { id: 'message-1', text: '' },
      project: { id: 'project-1', name: 'Coleção' },
      recipient: { language: 'fr-FR' },
      sender: { name: 'Catarina' },
      hasAttachment: true,
    });

    expect(payload.title).to.equal('Catarina dans Général');
    expect(payload.body).to.equal('A envoyé un fichier');
  });

  it('pins the delivery controls and classifies provider failures without exposing response bodies', () => {
    expect(getSendOptions()).to.deep.equal({ TTL: 600, urgency: 'high', timeout: 10000 });
    expect(classifyWebPushError({ statusCode: 410 })).to.equal('expired');
    expect(classifyWebPushError({ statusCode: 429 })).to.equal('retry');
    expect(classifyWebPushError({ statusCode: 503 })).to.equal('retry');
    expect(classifyWebPushError({ statusCode: 403 })).to.equal('permanent');
    expect(classifyWebPushError({ code: 'INVALID_SUBSCRIPTION' })).to.equal('permanent');
    expect(classifyWebPushError({ code: 'ETIMEDOUT' })).to.equal('retry');
    expect(classifyWebPushError({ code: 'WEB_PUSH_CONFIG' })).to.equal('permanent');
    expect(classifyWebPushError(new Error('local encryption failure'))).to.equal('permanent');
  });

  it('revalidates DNS immediately before sending with the pinned delivery options', async () => {
    const sendOnePath = require.resolve('../../api/helpers/web-push-notifications/send-one');
    const originalValidateEndpoint = subscriptionUtils.validateWebPushEndpoint;
    const originalSendNotification = webpush.sendNotification;
    const calls = [];

    subscriptionUtils.validateWebPushEndpoint = async (endpoint) => {
      calls.push({ type: 'validate', endpoint });
      return 'https://push.example.test/normalized';
    };
    webpush.sendNotification = async (subscription, payload, options) => {
      calls.push({ type: 'send', subscription, payload, options });
      return { statusCode: 201 };
    };
    delete require.cache[sendOnePath];

    try {
      // Reload after replacing the dependencies captured by the helper module.
      // eslint-disable-next-line global-require
      const sendOne = require('../../api/helpers/web-push-notifications/send-one');
      await sendOne.fn({
        subscription: {
          endpoint: 'https://push.example.test/original',
          p256dh: 'public-key',
          auth: 'auth-secret',
        },
        payload: { version: 1, messageId: 'message-1' },
      });

      expect(calls[0]).to.deep.equal({
        type: 'validate',
        endpoint: 'https://push.example.test/original',
      });
      expect(calls[1]).to.deep.equal({
        type: 'send',
        subscription: {
          endpoint: 'https://push.example.test/normalized',
          keys: { p256dh: 'public-key', auth: 'auth-secret' },
        },
        payload: JSON.stringify({ version: 1, messageId: 'message-1' }),
        options: { TTL: 600, urgency: 'high', timeout: 10000 },
      });
    } finally {
      subscriptionUtils.validateWebPushEndpoint = originalValidateEndpoint;
      webpush.sendNotification = originalSendNotification;
      delete require.cache[sendOnePath];
    }
  });

  it('persists eligible text notifications in the caller transaction', async () => {
    const queryCalls = [];
    global.sails = {
      config: { custom: { webPush: { enabled: true } } },
      sendNativeQuery: (sql, values) => {
        queryCalls.push({ sql, values });
        return {
          usingConnection: async (connection) => {
            expect(connection).to.equal('transaction');
            return { rowCount: 2 };
          },
        };
      },
    };

    const count = await scheduleNotification.fn({
      message: { id: 'message-1', text: 'Hello @[Catarina](mentioned)' },
      conversation: { id: 'conversation-1', type: 'projectGroup' },
      recipientUserIds: ['sender', 'mentioned', 'other'],
      senderUserId: 'sender',
      db: 'transaction',
    });

    expect(count).to.equal(2);
    expect(queryCalls).to.have.length(1);
    expect(queryCalls[0].sql).to.include('FROM web_push_subscription');
    expect(queryCalls[0].sql).to.include("user_account.notification_level <> 'none'");
    expect(queryCalls[0].sql).to.include('ON CONFLICT (message_id, user_id) DO NOTHING');
    expect(queryCalls[0].values).to.deep.equal([
      'message-1',
      'conversation-1',
      ['mentioned', 'other'],
      ['mention', 'general'],
    ]);
  });

  it('does not schedule an attachment-only message before its first attachment is persisted', async () => {
    global.sails = {
      config: { custom: { webPush: { enabled: true } } },
      sendNativeQuery: () => {
        throw new Error('query must not run');
      },
    };

    const count = await scheduleNotification.fn({
      message: { id: 'message-1', text: '' },
      conversation: { id: 'conversation-1', type: 'projectGroup' },
      recipientUserIds: ['recipient'],
      senderUserId: 'sender',
    });

    expect(count).to.equal(0);
  });

  it('localizes German notification copy', () => {
    const payload = buildPayload({
      conversation: { id: 'conversation-1', type: 'projectGroup' },
      message: { id: 'message-1', text: '' },
      project: { id: 'project-1', name: 'Kollektion' },
      recipient: { language: 'de-DE' },
      sender: { name: 'Catarina' },
      hasAttachment: true,
    });

    expect(payload).to.include({
      title: 'Catarina in Allgemein',
      body: 'Hat eine Datei gesendet',
      replyActionLabel: 'Antworten',
    });
  });

  it('uses the server translator for push copy when provided', () => {
    const calls = [];
    const translate = (key, ...values) => {
      calls.push({ key, values });
      const copy = {
        'webPush:title': '%s · %s',
        'webPush:general': 'Localized general',
        'webPush:reply': 'Localized reply',
        'webPush:attachment': 'Localized attachment',
      };
      return copy[key].replace(/%s/g, () => values.shift() || '');
    };

    const payload = buildPayload({
      conversation: { id: 'conversation-1', type: 'projectGroup' },
      message: { id: 'message-1', text: '' },
      project: { id: 'project-1', name: 'Project' },
      recipient: { language: 'pt-PT' },
      sender: { name: 'Sender' },
      hasAttachment: true,
      translate,
    });

    expect(payload).to.include({
      title: 'Sender · Localized general',
      body: 'Localized attachment',
      replyActionLabel: 'Localized reply',
    });
    expect(calls.map(({ key }) => key)).to.deep.equal([
      'webPush:attachment',
      'webPush:general',
      'webPush:reply',
      'webPush:title',
    ]);
  });

  it('claims with the outbox lock and removes only the subscription rejected as expired', async () => {
    const globalNames = [
      'ChatConversation',
      'ChatMessage',
      'ChatMessageAttachment',
      'ChatParticipant',
      'Project',
      'User',
    ];
    const previousGlobals = Object.fromEntries(globalNames.map((name) => [name, global[name]]));
    const sqlCalls = [];
    const row = {
      id: 'notification-1',
      messageId: 'message-1',
      conversationId: 'conversation-1',
      userId: 'recipient',
      kind: 'general',
      attempts: 1,
      createdAt: new Date(),
    };

    global.ChatConversation = {
      Types: { PROJECT_GROUP: 'projectGroup' },
      qm: {
        getOneById: async () => ({
          id: 'conversation-1',
          projectId: 'project-1',
          type: 'projectGroup',
        }),
      },
    };
    global.ChatMessage = {
      qm: {
        getOneById: async () => ({
          id: 'message-1',
          conversationId: 'conversation-1',
          userId: 'sender',
          text: 'Hello',
        }),
      },
    };
    global.ChatMessageAttachment = { count: async () => 0 };
    global.ChatParticipant = {
      NotificationLevels: { MENTIONS: 'mentions' },
      isMuted: () => false,
      qm: { getOneByConversationIdAndUserId: async () => null },
    };
    global.Project = { qm: { getOneById: async () => ({ id: 'project-1', name: 'Project' }) } };
    global.User = {
      NotificationLevels: { ALL: 'all', ESSENTIAL: 'essential', NONE: 'none' },
      qm: {
        getOneById: async (id) => ({
          id,
          name: id === 'sender' ? 'Sender' : 'Recipient',
          language: 'en-US',
          notificationLevel: 'all',
          isDeactivated: false,
        }),
      },
    };
    global.sails = {
      config: { custom: { webPush: { enabled: true } } },
      getDatastore: () => ({ transaction: (callback) => callback('db') }),
      helpers: {
        chat: { getConversationRecipientUserIds: async () => ['recipient'] },
        webPushNotifications: {
          sendOne: {
            with: async () => Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 })),
          },
        },
      },
      log: { error: () => {}, info: () => {}, warn: () => {} },
      sendNativeQuery: (sql, values) => {
        sqlCalls.push({ sql, values });
        if (sql.includes('WITH due AS')) {
          return { usingConnection: async () => ({ rows: [row] }) };
        }
        if (sql.includes('SELECT\n       id,') && sql.includes('FROM web_push_subscription')) {
          return {
            rows: [
              {
                id: 'subscription-1',
                userId: 'recipient',
                endpoint: 'https://push.example.test/one',
                p256dh: 'key',
                auth: 'auth',
              },
            ],
          };
        }
        return { rows: [], rowCount: 1 };
      },
    };

    try {
      const result = await processDueNotifications.fn({});
      expect(result).to.deep.equal({ claimed: 1, failed: 0, retried: 0, sent: 0, skipped: 1 });
      const deleteCall = sqlCalls.find(({ sql }) =>
        sql.includes('DELETE FROM web_push_subscription'),
      );
      expect(deleteCall.values).to.deep.equal([['subscription-1'], 'recipient']);
      expect(sqlCalls.some(({ sql }) => sql.includes('FOR UPDATE SKIP LOCKED'))).to.equal(true);
      expect(
        sqlCalls.some(
          ({ sql, values }) =>
            sql.includes("status = 'skipped'") && values[1] === 'EXPIRED_SUBSCRIPTIONS_REMOVED',
        ),
      ).to.equal(true);
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
