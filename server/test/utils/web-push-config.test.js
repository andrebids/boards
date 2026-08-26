const { expect } = require('chai');

const { parseWebPushConfig } = require('../../utils/web-push-config');

const VALID_ENV = {
  WEB_PUSH_ENABLED: 'true',
  VAPID_PUBLIC_KEY: 'B'.repeat(87),
  VAPID_PRIVATE_KEY: 'a'.repeat(43),
  VAPID_SUBJECT: 'mailto:boards@example.com',
};

describe('web-push config', () => {
  it('is disabled without exposing configured secrets by default', () => {
    expect(parseWebPushConfig({})).to.deep.equal({
      enabled: false,
      publicKey: null,
      privateKey: null,
      subject: null,
    });
  });

  it('accepts a complete VAPID configuration', () => {
    expect(parseWebPushConfig(VALID_ENV)).to.deep.equal({
      enabled: true,
      publicKey: VALID_ENV.VAPID_PUBLIC_KEY,
      privateKey: VALID_ENV.VAPID_PRIVATE_KEY,
      subject: VALID_ENV.VAPID_SUBJECT,
    });
  });

  it('fails early without including secret values in the error', () => {
    const privateKey = 'private-value-that-must-not-leak';

    let error;
    try {
      parseWebPushConfig({
        ...VALID_ENV,
        VAPID_PRIVATE_KEY: privateKey,
        VAPID_SUBJECT: '',
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error.message).to.equal('WEB_PUSH_ENABLED requires valid VAPID configuration');
    expect(error.message).not.to.include(privateKey);
  });

  it('rejects localhost and non-HTTPS URL subjects', () => {
    expect(() =>
      parseWebPushConfig({
        ...VALID_ENV,
        VAPID_SUBJECT: 'https://localhost',
      }),
    ).to.throw('WEB_PUSH_ENABLED requires valid VAPID configuration');

    expect(() =>
      parseWebPushConfig({
        ...VALID_ENV,
        VAPID_SUBJECT: 'http://boards.example.com',
      }),
    ).to.throw('WEB_PUSH_ENABLED requires valid VAPID configuration');
  });
});
