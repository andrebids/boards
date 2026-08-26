const { expect } = require('chai');
const lodash = require('lodash');

const helper = require('../../api/helpers/web-push-subscriptions/upsert-one');
const presentOne = require('../../api/helpers/web-push-subscriptions/present-one');

describe('web-push subscription upsert', () => {
  let originalSails;
  let originalUnderscore;
  let originalWebPushSubscription;

  beforeEach(() => {
    originalSails = global.sails;
    originalUnderscore = global._;
    originalWebPushSubscription = global.WebPushSubscription;
  });

  afterEach(() => {
    global.sails = originalSails;
    global._ = originalUnderscore;
    global.WebPushSubscription = originalWebPushSubscription;
  });

  it('never presents endpoint or encryption keys back through the API', () => {
    global._ = lodash;

    expect(
      presentOne.fn({
        record: {
          id: 'subscription-1',
          endpoint: 'https://push.example.com/secret',
          p256dh: 'public-key',
          auth: 'auth-secret',
          expirationTime: null,
        },
      }),
    ).to.deep.equal({ id: 'subscription-1', expirationTime: null });
  });

  it('never reassigns an endpoint owned by another user', async () => {
    global.sails = {
      getDatastore: () => ({ transaction: (callback) => callback({}) }),
    };
    global.WebPushSubscription = {
      qm: {
        getOneByEndpoint: async () => ({
          id: 'subscription-1',
          userId: 'other-user',
        }),
      },
    };

    let error;
    try {
      await helper.fn({
        user: { id: 'current-user' },
        subscription: {
          endpoint: 'https://push.example.com/id',
          keys: { p256dh: 'p256dh', auth: 'auth' },
          expirationTime: null,
        },
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).to.equal('endpointOwnedByAnotherUser');
  });

  it('updates an existing endpoint idempotently for its owner', async () => {
    let updateArguments;
    global.sails = {
      getDatastore: () => ({
        transaction: (callback) => callback({ transaction: true }),
      }),
    };
    global.WebPushSubscription = {
      qm: {
        getOneByEndpoint: async () => ({
          id: 'subscription-1',
          userId: 123,
        }),
        updateOne: async (...args) => {
          updateArguments = args;
          return { id: 'subscription-1' };
        },
      },
    };

    const result = await helper.fn({
      user: { id: '123' },
      subscription: {
        endpoint: 'https://push.example.com/id',
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
        expirationTime: null,
      },
    });

    expect(result).to.deep.equal({ id: 'subscription-1' });
    expect(updateArguments.slice(0, 2)).to.deep.equal([
      'subscription-1',
      { p256dh: 'new-p256dh', auth: 'new-auth', expirationTime: null },
    ]);
    expect(updateArguments[2]).to.deep.equal({ transaction: true });
  });

  it('removes the oldest subscription before creating an eleventh active one', async () => {
    const deletedIds = [];
    global.sails = {
      getDatastore: () => ({
        transaction: (callback) => callback({ transaction: true }),
      }),
    };
    global.WebPushSubscription = {
      qm: {
        getOneByEndpoint: async () => null,
        getByUserId: async () =>
          Array.from({ length: 11 }, (_, index) => ({
            id: String(index + 1),
            createdAt: new Date(2026, 0, index + 1).toISOString(),
            expirationTime: null,
          })),
        delete: async (ids) => deletedIds.push(...ids),
        createOne: async (values) => ({ id: 'new-subscription', ...values }),
      },
    };

    const result = await helper.fn({
      user: { id: 'current-user' },
      subscription: {
        endpoint: 'https://push.example.com/new-id',
        keys: { p256dh: 'p256dh', auth: 'auth' },
        expirationTime: null,
      },
    });

    expect(deletedIds).to.deep.equal(['1']);
    expect(result).to.include({
      id: 'new-subscription',
      endpoint: 'https://push.example.com/new-id',
      userId: 'current-user',
    });
  });
});
