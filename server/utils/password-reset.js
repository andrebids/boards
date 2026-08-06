/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

const TOKEN_BYTES = 32;
const IV_BYTES = 12;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const hashPrivateValue = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

const getEncryptionKey = (secret) =>
  crypto.createHash('sha256').update(`password-reset:${secret}`).digest();

const encryptToken = (token, secret) => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
};

const decryptToken = (encryptedToken, secret) => {
  const payload = Buffer.from(encryptedToken, 'base64url');
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = payload.subarray(IV_BYTES + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(secret), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

const generateToken = () => crypto.randomBytes(TOKEN_BYTES).toString('base64url');

module.exports = {
  decryptToken,
  encryptToken,
  generateToken,
  hashPrivateValue,
  hashToken,
};
