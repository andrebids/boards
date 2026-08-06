const { expect } = require('chai');

const {
  decryptToken,
  encryptToken,
  generateToken,
  hashPrivateValue,
  hashToken,
} = require('../../utils/password-reset');

describe('password-reset cryptography', () => {
  const secret = 'test-secret-that-is-not-used-outside-this-test';

  it('generates independent 256-bit URL-safe tokens', () => {
    const first = generateToken();
    const second = generateToken();

    expect(first).to.have.lengthOf(43);
    expect(first).to.match(/^[A-Za-z0-9_-]+$/);
    expect(first).to.not.equal(second);
  });

  it('creates deterministic token hashes without retaining the token', () => {
    const token = generateToken();
    const digest = hashToken(token);

    expect(digest).to.have.lengthOf(64);
    expect(digest).to.equal(hashToken(token));
    expect(digest).to.not.contain(token);
  });

  it('encrypts tokens with authenticated encryption and decrypts them', () => {
    const token = generateToken();
    const encrypted = encryptToken(token, secret);

    expect(encrypted).to.not.contain(token);
    expect(decryptToken(encrypted, secret)).to.equal(token);
    expect(() => decryptToken(encrypted, 'wrong-secret')).to.throw();
  });

  it('uses a keyed digest for private rate-limit identifiers', () => {
    const email = 'person@example.com';

    expect(hashPrivateValue(email, secret)).to.equal(hashPrivateValue(email, secret));
    expect(hashPrivateValue(email, secret)).to.not.equal(
      hashPrivateValue(email, 'different-secret'),
    );
  });
});
