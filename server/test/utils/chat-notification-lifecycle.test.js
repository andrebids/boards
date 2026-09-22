// Fixtures intentionally mutate shared transaction and membership state to order races.
/* eslint-disable no-param-reassign */
const { expect } = require('chai');

const emailProcessor = require('../../api/helpers/chat-email-notifications/process-due');
const pushProcessor = require('../../api/helpers/web-push-notifications/process-due');
const { withConversationLock } = require('../../utils/chat-lifecycle');
const participantModel = require('../../api/models/ChatParticipant');

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

// Exercise the real lifecycle utility with a deterministic, in-memory advisory lock.
// All storage and outbound helpers are mocked; no Sails lift or network is used.
const setup = (kind) => {
  const state = {
    conversation: {
      id: '1',
      projectId: '2',
      type: 'projectCustomGroup',
      title: 'Group',
    },
    participants: [{ userId: '3', leftAt: null, notificationLevel: 'all' }],
    message: { id: '10', conversationId: '1', userId: '4', text: 'Hello' },
    authorizedUserIds: ['3'],
    deliveries: [],
    updates: [],
    errors: [],
    lockHeld: false,
    lockTail: Promise.resolve(),
    subscriptionCount: 5,
  };
  const row = {
    id: '20',
    messageId: '10',
    conversationId: '1',
    userId: '3',
    kind: 'mention',
    attempts: 1,
    createdAt: new Date(),
  };
  const execute = async (sql, values, db) => {
    if (sql.includes('pg_advisory_xact_lock')) {
      const previous = state.lockTail;
      const released = deferred();
      state.lockTail = released.promise;
      if (state.onLockRequest) state.onLockRequest();
      await previous;
      state.lockHeld = true;
      db.release = () => {
        state.lockHeld = false;
        released.resolve();
      };
      return { rows: [] };
    }
    if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ acquired: true }] };
    if (sql.includes('SELECT user_id, conversation_id')) {
      return { rowCount: 1, rows: [{ user_id: '3', conversation_id: '1' }] };
    }
    if (sql.includes('WITH due AS') || sql.includes('RETURNING\n           id,')) {
      return { rows: [row] };
    }
    if (sql.includes('FROM web_push_subscription')) {
      return {
        rows: Array.from({ length: state.subscriptionCount }, (_, index) => ({
          id: String(index + 30),
          userId: '3',
        })),
      };
    }
    state.updates.push({ sql, values });
    return { rows: [], rowCount: 1 };
  };
  const send = async (payload) => {
    expect(state.lockHeld, 'delivery must hold the conversation lock').to.equal(true);
    expect(state.participants[0].leftAt, 'departure must not precede delivery').to.equal(null);
    if (state.onSend) await state.onSend(payload);
    state.deliveries.push(payload);
    return { messageId: 'mock-email' };
  };
  global.ChatConversation = {
    Types: { PROJECT_GROUP: 'projectGroup' },
    findOne: () => ({ usingConnection: async () => state.conversation }),
  };
  global.ChatParticipant = {
    ...participantModel,
    find: () => ({
      sort: () => ({
        usingConnection: async () => state.participants.map((p) => ({ ...p })),
      }),
    }),
  };
  global.ChatMessage = {
    find: () => ({ sort: async () => [state.message] }),
    qm: { getOneById: async () => state.message },
  };
  global.ChatMessageAttachment = { count: async () => 0 };
  global.Project = {
    qm: { getOneById: async () => ({ id: '2', name: 'Project' }) },
  };
  global.User = {
    NotificationLevels: { NONE: 'none', ESSENTIAL: 'essential' },
    qm: {
      getOneById: async (id) => ({
        id,
        name: 'User',
        language: 'en-US',
        email: 'mock@example.test',
        notificationLevel: 'all',
      }),
      getByIds: async () => [{ id: '4', name: 'Sender' }],
    },
  };
  global.sails = {
    config: {
      custom: {
        chatEmailNotificationsEnabled: true,
        chatEmailNotificationMaxAttempts: 3,
        baseUrl: 'https://example.test',
        webPush: { enabled: true },
      },
    },
    hooks: { smtp: { isEnabled: () => true } },
    log: { info() {}, warn() {}, error: (...args) => state.errors.push(args) },
    getDatastore: () => ({
      transaction: async (callback) => {
        const db = {};
        try {
          return await callback(db);
        } finally {
          if (db.release) db.release();
        }
      },
    }),
    sendNativeQuery: (sql, values) => ({
      usingConnection: (db) => execute(sql, values, db),
      then: (resolve, reject) => execute(sql, values).then(resolve, reject),
    }),
    helpers: {
      chat: {
        getConversationRecipientUserIds: async () => state.authorizedUserIds,
      },
      utils: {
        compileEmailTemplate: {
          with: async () => {
            if (state.onCompile) await state.onCompile();
            return '<p>Mock email</p>';
          },
        },
        sendEmail: { with: send },
      },
      webPushNotifications: { sendOne: { with: send } },
    },
  };
  state.run = () =>
    kind === 'email' ? emailProcessor.fn({ maxBatches: 1 }) : pushProcessor.fn({});
  return state;
};

describe('Pending chat notifications and participant departure', () => {
  const globalNames = [
    'sails',
    'ChatConversation',
    'ChatParticipant',
    'ChatMessage',
    'ChatMessageAttachment',
    'Project',
    'User',
  ];
  let previousGlobals;
  beforeEach(() => {
    previousGlobals = new Map(globalNames.map((name) => [name, global[name]]));
  });
  afterEach(() => {
    previousGlobals.forEach((value, name) => {
      if (value === undefined) delete global[name];
      else global[name] = value;
    });
  });

  ['email', 'push'].forEach((kind) => {
    describe(kind, () => {
      it('reloads membership after waiting for a departure to commit', async () => {
        const state = setup(kind);
        const departureEntered = deferred();
        const finishDeparture = deferred();
        const departure = withConversationLock('1', async () => {
          departureEntered.resolve();
          await finishDeparture.promise;
          state.participants[0].leftAt = new Date();
        });
        await departureEntered.promise;
        const deliveryWaiting = deferred();
        state.onLockRequest = deliveryWaiting.resolve;
        const processing = state.run();
        await deliveryWaiting.promise;
        expect(state.deliveries).to.have.length(0);
        finishDeparture.resolve();
        await departure;
        const result = await processing;
        expect(result.skipped).to.equal(1);
        expect(result.sent).to.equal(0);
        expect(state.deliveries).to.have.length(0);
      });

      it('holds departure until preparation and all deliveries finish', async () => {
        const state = setup(kind);
        const entered = deferred();
        const finishDelivery = deferred();
        const pause = async () => {
          entered.resolve();
          await finishDelivery.promise;
        };
        if (kind === 'email') state.onCompile = pause;
        else state.onSend = pause;
        const processing = state.run();
        await entered.promise;
        const departureWaiting = deferred();
        state.onLockRequest = departureWaiting.resolve;
        const departure = withConversationLock('1', async () => {
          expect(state.deliveries).to.have.length(kind === 'email' ? 1 : 5);
          state.participants[0].leftAt = new Date();
        });
        await departureWaiting.promise;
        expect(state.participants[0].leftAt).to.equal(null);
        finishDelivery.resolve();
        const [result] = await Promise.all([processing, departure]);
        expect(result.sent).to.equal(1);
        expect(state.participants[0].leftAt).not.to.equal(null);
      });

      const deniedStates = {
        archived: (state) => {
          state.conversation.archivedAt = new Date();
        },
        departed: (state) => {
          state.participants[0].leftAt = new Date();
        },
        removed: (state) => {
          state.participants = [];
        },
        muted: (state) => {
          state.participants[0].notificationLevel = 'none';
        },
        'project access revoked': (state) => {
          state.authorizedUserIds = [];
        },
        'message deleted': (state) => {
          state.message.deletedAt = new Date();
        },
        'message read': (state) => {
          state.participants[0].lastReadMessageId = '10';
        },
      };
      Object.entries(deniedStates).forEach(([name, change]) => {
        it(`skips pending delivery when ${name}`, async () => {
          const state = setup(kind);
          change(state);
          const result = await state.run();
          expect(result.skipped).to.equal(1);
          expect(state.deliveries).to.have.length(0);
          expect(state.lockHeld).to.equal(false);
        });
      });

      it('releases the lock and preserves retry behavior on provider failure', async () => {
        const state = setup(kind);
        state.onSend = async () => {
          throw Object.assign(new Error('offline'), { code: 'ETIMEDOUT' });
        };
        const result = await state.run();
        expect(result[kind === 'email' ? 'failed' : 'retried']).to.equal(1);
        expect(state.lockHeld).to.equal(false);
        expect(state.updates.some(({ sql }) => sql.includes('scheduled_at = NOW()'))).to.equal(
          true,
        );
        await withConversationLock('1', async () => {
          state.participants[0].leftAt = new Date();
        });
        expect(state.participants[0].leftAt).not.to.equal(null);
      });
    });
  });
});
