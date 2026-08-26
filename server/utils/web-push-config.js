const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

const isBase64UrlBytes = (value, byteLength) => {
  if (typeof value !== 'string' || !BASE64URL_REGEX.test(value)) {
    return false;
  }

  return Buffer.from(value, 'base64url').length === byteLength;
};

const isValidSubject = (value) => {
  if (typeof value !== 'string' || value.length > 2048) {
    return false;
  }

  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname.toLowerCase() !== 'localhost' &&
      !url.hostname.toLowerCase().endsWith('.localhost')
    );
  } catch (_error) {
    return false;
  }
};

const parseWebPushConfig = (env) => {
  const enabled = env.WEB_PUSH_ENABLED === 'true';

  if (!enabled) {
    return {
      enabled: false,
      publicKey: null,
      privateKey: null,
      subject: null,
    };
  }

  const publicKey = env.VAPID_PUBLIC_KEY || null;
  const privateKey = env.VAPID_PRIVATE_KEY || null;
  const subject = env.VAPID_SUBJECT || null;

  if (
    !isBase64UrlBytes(publicKey, 65) ||
    !isBase64UrlBytes(privateKey, 32) ||
    !isValidSubject(subject)
  ) {
    throw new Error('WEB_PUSH_ENABLED requires valid VAPID configuration');
  }

  return {
    enabled: true,
    publicKey,
    privateKey,
    subject,
  };
};

module.exports = {
  parseWebPushConfig,
};
