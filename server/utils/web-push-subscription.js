const dns = require('dns');
const net = require('net');

const ENDPOINT_MAX_LENGTH = 2048;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

const invalidSubscription = () => {
  const error = new Error('Invalid Web Push subscription');
  error.code = 'INVALID_SUBSCRIPTION';
  return error;
};

const isPublicIpv4Address = (address, allowDocumentationAddresses = false) => {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [a, b] = octets;
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  ) {
    return false;
  }

  if (
    !allowDocumentationAddresses &&
    ((a === 192 && b === 0 && octets[2] === 2) ||
      (a === 198 && b === 51 && octets[2] === 100) ||
      (a === 203 && b === 0 && octets[2] === 113))
  ) {
    return false;
  }

  return true;
};

const isPublicIpv6Address = (address) => {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');

  if (normalized.startsWith('::ffff:')) {
    const mappedAddress = normalized.slice('::ffff:'.length);
    return net.isIP(mappedAddress) === 4 && isPublicIpv4Address(mappedAddress);
  }

  const [firstHextetValue, secondHextetValue = '0'] = normalized.split(':');
  const firstHextet = Number.parseInt(firstHextetValue, 16);
  const secondHextet = Number.parseInt(secondHextetValue || '0', 16);

  if (!Number.isInteger(firstHextet) || !Number.isInteger(secondHextet)) {
    return false;
  }

  // Push services only need globally routable unicast addresses (2000::/3).
  if (firstHextet < 0x2000 || firstHextet > 0x3fff) {
    return false;
  }

  return !(
    (firstHextet === 0x2001 && secondHextet <= 0x01ff) ||
    (firstHextet === 0x2001 && secondHextet === 0x0db8) ||
    firstHextet === 0x2002 ||
    firstHextet === 0x3ffe ||
    firstHextet === 0x3fff
  );
};

const isPublicIpAddress = (address, options = {}) => {
  const family = net.isIP(address.replace(/^\[|\]$/g, ''));
  if (family === 4) {
    return isPublicIpv4Address(address, options.allowDocumentationAddresses);
  }
  if (family === 6) {
    return isPublicIpv6Address(address);
  }
  return false;
};

const isBase64UrlBytes = (value, byteLength) =>
  typeof value === 'string' &&
  BASE64URL_REGEX.test(value) &&
  Buffer.from(value, 'base64url').length === byteLength;

const validateWebPushEndpoint = async (endpoint, options = {}) => {
  if (
    typeof endpoint !== 'string' ||
    endpoint.length === 0 ||
    endpoint.length > ENDPOINT_MAX_LENGTH
  ) {
    throw invalidSubscription();
  }

  let url;
  try {
    url = new URL(endpoint);
  } catch (_error) {
    throw invalidSubscription();
  }

  const normalizedEndpoint = url.toString();
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    normalizedEndpoint.length > ENDPOINT_MAX_LENGTH ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  ) {
    throw invalidSubscription();
  }

  if (net.isIP(hostname)) {
    if (!isPublicIpAddress(hostname, options)) {
      throw invalidSubscription();
    }
  } else if (options.resolveDns !== false) {
    let addresses;
    try {
      const lookup = options.lookup || dns.promises.lookup;
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch (_error) {
      throw invalidSubscription();
    }

    const normalizedAddresses = Array.isArray(addresses) ? addresses : [addresses];
    if (
      normalizedAddresses.length === 0 ||
      normalizedAddresses.some(({ address }) => !isPublicIpAddress(address, options))
    ) {
      throw invalidSubscription();
    }
  }

  return normalizedEndpoint;
};

const validateWebPushSubscription = async (subscription, options = {}) => {
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    throw invalidSubscription();
  }

  const { endpoint, keys, expirationTime = null } = subscription;
  if (
    !keys ||
    typeof keys !== 'object' ||
    !isBase64UrlBytes(keys.p256dh, 65) ||
    !isBase64UrlBytes(keys.auth, 16) ||
    (expirationTime !== null &&
      (!Number.isSafeInteger(expirationTime) || expirationTime <= Date.now()))
  ) {
    throw invalidSubscription();
  }

  const normalizedEndpoint = await validateWebPushEndpoint(endpoint, options);

  return {
    endpoint: normalizedEndpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    expirationTime,
  };
};

const selectWebPushSubscriptionsToPrune = (subscriptions, now = Date.now(), limit = 10) => {
  const sorted = [...subscriptions].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const expired = sorted.filter(
    ({ expirationTime }) => expirationTime !== null && Number(expirationTime) <= now,
  );
  const active = sorted.filter(
    ({ expirationTime }) => expirationTime === null || Number(expirationTime) > now,
  );
  const activeSlots = Math.max(0, limit);

  return [...expired, ...active.slice(0, Math.max(0, active.length - activeSlots))];
};

module.exports = {
  isPublicIpAddress,
  selectWebPushSubscriptionsToPrune,
  validateWebPushEndpoint,
  validateWebPushSubscription,
};
