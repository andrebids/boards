/*! Copyright (c) 2024 PLANKA Software GmbH */

export const WebPushStates = {
  INACTIVE: 'inactive',
  ACTIVATING: 'activating',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
};

const WORKER_URL = '/boards-push-sw.js';

const getDefaultEnvironment = () => ({
  navigator: window.navigator,
  notification: window.Notification,
  pushManager: window.PushManager,
});

export const isWebPushSupported = (environment = getDefaultEnvironment()) =>
  Boolean(
    environment.notification && environment.navigator?.serviceWorker && environment.pushManager,
  );

export const getWebPushErrorState = (error) => {
  const message = String((error && error.message) || '').toLowerCase();
  if (
    (error && error.name === 'NotAllowedError') ||
    message.includes('permission denied') ||
    message.includes('permission is denied')
  ) {
    return WebPushStates.BLOCKED;
  }

  return WebPushStates.ERROR;
};

export const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(base64);

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
};

const registerWorker = (environment) =>
  environment.navigator.serviceWorker.register(WORKER_URL, {
    scope: '/',
    updateViaCache: 'none',
  });

export const reconcileWebPush = async ({
  enabled,
  environment = getDefaultEnvironment(),
  publicKey,
  syncSubscription,
}) => {
  if (!enabled || !publicKey || !isWebPushSupported(environment)) {
    return WebPushStates.UNSUPPORTED;
  }

  if (environment.notification.permission === 'denied') {
    return WebPushStates.BLOCKED;
  }

  if (environment.notification.permission !== 'granted') {
    return WebPushStates.INACTIVE;
  }

  const registration = await registerWorker(environment);
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return WebPushStates.INACTIVE;
  }

  await syncSubscription(subscription.toJSON());
  return WebPushStates.ACTIVE;
};

export const activateWebPush = async ({
  environment = getDefaultEnvironment(),
  publicKey,
  syncSubscription,
}) => {
  if (!publicKey || !isWebPushSupported(environment)) {
    return WebPushStates.UNSUPPORTED;
  }

  let { permission } = environment.notification;
  if (permission === 'default') {
    permission = await environment.notification.requestPermission();
  }

  if (permission === 'denied') {
    return WebPushStates.BLOCKED;
  }
  if (permission !== 'granted') {
    return WebPushStates.INACTIVE;
  }

  const registration = await registerWorker(environment);
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    });
  }

  await syncSubscription(subscription.toJSON());
  return WebPushStates.ACTIVE;
};

export const disableWebPush = async ({
  environment = getDefaultEnvironment(),
  removeSubscription,
}) => {
  if (!isWebPushSupported(environment)) {
    return WebPushStates.UNSUPPORTED;
  }

  const registration = await environment.navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return WebPushStates.INACTIVE;
  }

  const remoteRemoval = Promise.resolve().then(() => removeSubscription(subscription.endpoint));
  const [remoteResult, localResult] = await Promise.allSettled([
    remoteRemoval,
    subscription.unsubscribe(),
  ]);

  if (localResult.status === 'rejected') {
    throw localResult.reason;
  }
  if (remoteResult.status === 'rejected') {
    throw remoteResult.reason;
  }

  return WebPushStates.INACTIVE;
};

export const disableWebPushForLogout = async ({
  environment = getDefaultEnvironment(),
  removeSubscription,
}) => {
  if (!isWebPushSupported(environment)) {
    return;
  }

  const registration = await environment.navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  Promise.resolve()
    .then(() => removeSubscription(subscription.endpoint))
    .catch(() => {});
  await subscription.unsubscribe();
};

export const showWebPushTestNotification = async (
  environment = getDefaultEnvironment(),
  content = {},
) => {
  if (!isWebPushSupported(environment) || environment.notification.permission !== 'granted') {
    return false;
  }

  const registration = await environment.navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    return false;
  }

  await registration.showNotification(content.title || 'Boards', {
    body: content.body || '',
    icon: '/logo192.png',
    renotify: true,
    requireInteraction: true,
    silent: false,
    tag: 'boards-web-push-test',
  });
  return true;
};
