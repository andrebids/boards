const { expect } = require('chai');

const {
  isPublicIpAddress,
  selectWebPushSubscriptionsToPrune,
  validateWebPushSubscription,
} = require('../../utils/web-push-subscription');
const WebPushSubscription = require('../../api/models/WebPushSubscription');

const validSubscription = {
  endpoint: 'https://push.example.com/send/subscription-id',
  keys: {
    p256dh: 'B'.repeat(87),
    auth: 'a'.repeat(22),
  },
  expirationTime: null,
};

describe('web-push subscription validation', () => {
  it('maps the browser public-key attribute to the migration column', () => {
    expect(WebPushSubscription.attributes.p256dh.columnName).to.equal('p_256_dh');
  });

  it('accepts an HTTPS endpoint whose DNS addresses are public', async () => {
    const result = await validateWebPushSubscription(validSubscription, {
      lookup: async () => [{ address: '203.0.113.10' }],
      allowDocumentationAddresses: true,
    });

    expect(result).to.deep.equal(validSubscription);
  });

  it('rejects invalid key sizes and Base64URL padding', async () => {
    await Promise.all(
      [
        { p256dh: 'short', auth: 'a'.repeat(22) },
        { p256dh: `${'B'.repeat(86)}=`, auth: 'a'.repeat(22) },
        { p256dh: 'B'.repeat(87), auth: 'short' },
      ].map(async (keys) => {
        let error;
        try {
          await validateWebPushSubscription({ ...validSubscription, keys });
        } catch (caughtError) {
          error = caughtError;
        }
        expect(error).to.have.property('code', 'INVALID_SUBSCRIPTION');
      }),
    );
  });

  it('rejects HTTP, credentials, fragments, localhost and private endpoint IPs', async () => {
    const endpoints = [
      'http://push.example.com/send/id',
      'https://user:password@push.example.com/send/id',
      'https://push.example.com/send/id#fragment',
      'https://localhost/send/id',
      'https://127.0.0.1/send/id',
      'https://10.0.0.1/send/id',
      'https://[::1]/send/id',
      'https://[fd00::1]/send/id',
      `https://push.example.com/${'é'.repeat(700)}`,
    ];

    await Promise.all(
      endpoints.map(async (endpoint) => {
        let error;
        try {
          await validateWebPushSubscription({ ...validSubscription, endpoint });
        } catch (caughtError) {
          error = caughtError;
        }
        expect(error, endpoint).to.have.property('code', 'INVALID_SUBSCRIPTION');
      }),
    );
  });

  it('rejects hostnames that resolve to a private or reserved address', async () => {
    let error;
    try {
      await validateWebPushSubscription(validSubscription, {
        lookup: async () => [{ address: '192.168.1.20' }],
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).to.have.property('code', 'INVALID_SUBSCRIPTION');
  });

  it('classifies private, reserved and public IP address families', () => {
    expect(isPublicIpAddress('8.8.8.8')).to.equal(true);
    expect(isPublicIpAddress('2606:4700:4700::1111')).to.equal(true);
    expect(isPublicIpAddress('100.64.0.1')).to.equal(false);
    expect(isPublicIpAddress('198.51.100.10')).to.equal(false);
    expect(isPublicIpAddress('fe80::1')).to.equal(false);
    expect(isPublicIpAddress('100::1')).to.equal(false);
    expect(isPublicIpAddress('2001::1')).to.equal(false);
    expect(isPublicIpAddress('2002::1')).to.equal(false);
    expect(isPublicIpAddress('2001:db8::1')).to.equal(false);
    expect(isPublicIpAddress('3ffe::1')).to.equal(false);
    expect(isPublicIpAddress('3fff::1')).to.equal(false);
    expect(isPublicIpAddress('2001:4860:4860::8888')).to.equal(true);
  });

  it('prunes expired subscriptions before the oldest active subscriptions', () => {
    const now = Date.now();
    const subscriptions = Array.from({ length: 12 }, (_, index) => ({
      id: String(index + 1),
      createdAt: new Date(now - (12 - index) * 1000).toISOString(),
      expirationTime: index === 5 ? now - 1000 : null,
    }));

    expect(
      selectWebPushSubscriptionsToPrune(subscriptions, now, 10).map(({ id }) => id),
    ).to.deep.equal(['6', '1']);
  });

  it('keeps exactly ten active subscriptions without pruning', () => {
    const subscriptions = Array.from({ length: 10 }, (_, index) => ({
      id: String(index + 1),
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      expirationTime: null,
    }));

    expect(selectWebPushSubscriptionsToPrune(subscriptions)).to.deep.equal([]);
  });
});
