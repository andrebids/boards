const STORAGE_KEY = 'boards-return-to';
const ALLOWED_PATH_PATTERN =
  /^\/(?:dashboard|projects\/[^/]+(?:\/(?:gantt|presentation))?|boards\/[^/]+|cards\/[^/]+)\/?$/;

const getOrigin = () => window.location.origin;
const getStorage = () => {
  try {
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
};

export const sanitizeReturnTo = (value, origin = getOrigin()) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  let url;
  try {
    url = new URL(value, origin);
  } catch (_) {
    return null;
  }

  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    !ALLOWED_PATH_PATTERN.test(url.pathname)
  ) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const clearReturnTo = (storage = getStorage()) => {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch (_) {
    // Storage may be disabled by the browser. Authentication must still continue.
  }
};

export const storeReturnTo = (value, storage = getStorage(), origin = getOrigin()) => {
  const target = sanitizeReturnTo(value, origin);
  if (!target || !storage) {
    clearReturnTo(storage);
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, target);
    return true;
  } catch (_) {
    return false;
  }
};

export const storeCurrentLocationForReturn = () =>
  storeReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);

export const consumeReturnTo = (storage = getStorage(), origin = getOrigin()) => {
  if (!storage) {
    return null;
  }

  try {
    return sanitizeReturnTo(storage.getItem(STORAGE_KEY), origin);
  } catch (_) {
    return null;
  } finally {
    clearReturnTo(storage);
  }
};

export default {
  clearReturnTo,
  consumeReturnTo,
  sanitizeReturnTo,
  storeCurrentLocationForReturn,
  storeReturnTo,
};
