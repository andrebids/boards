import {
  WebPushStates,
  activateWebPush,
  getWebPushErrorState,
  disableWebPush,
  disableWebPushForLogout,
  reconcileWebPush,
  showWebPushTestNotification,
  urlBase64ToUint8Array,
} from './web-push';

const makeSubscription = () => ({
  endpoint: 'https://push.example.test/subscription',
  toJSON: () => ({
    endpoint: 'https://push.example.test/subscription',
    expirationTime: null,
    keys: {
      auth: 'auth-key',
      p256dh: 'p256dh-key',
    },
  }),
  unsubscribe: jest.fn().mockResolvedValue(true),
});

const makeEnvironment = ({ permission = 'default', subscription = null } = {}) => {
  const pushManager = {
    getSubscription: jest.fn().mockResolvedValue(subscription),
    subscribe: jest.fn(),
  };
  const registration = { pushManager };

  return {
    notification: {
      permission,
      requestPermission: jest.fn(),
    },
    navigator: {
      serviceWorker: {
        getRegistration: jest.fn().mockResolvedValue(registration),
        register: jest.fn().mockResolvedValue(registration),
      },
    },
    pushManager,
    registration,
  };
};

describe('web push lifecycle', () => {
  test('converts a URL-safe VAPID key to bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQIDBA'))).toEqual([1, 2, 3, 4]);
  });

  test('does not request permission while reconciling an inactive browser', async () => {
    const environment = makeEnvironment();
    const syncSubscription = jest.fn();

    const state = await reconcileWebPush({
      environment,
      enabled: true,
      publicKey: 'AQIDBA',
      syncSubscription,
    });

    expect(state).toBe(WebPushStates.INACTIVE);
    expect(environment.notification.requestPermission).not.toHaveBeenCalled();
    expect(environment.navigator.serviceWorker.register).not.toHaveBeenCalled();
    expect(syncSubscription).not.toHaveBeenCalled();
  });

  test('reconciles an existing granted subscription without creating another', async () => {
    const subscription = makeSubscription();
    const environment = makeEnvironment({
      permission: 'granted',
      subscription,
    });
    const syncSubscription = jest.fn().mockResolvedValue(undefined);

    const state = await reconcileWebPush({
      environment,
      enabled: true,
      publicKey: 'AQIDBA',
      syncSubscription,
    });

    expect(state).toBe(WebPushStates.ACTIVE);
    expect(environment.pushManager.subscribe).not.toHaveBeenCalled();
    expect(syncSubscription).toHaveBeenCalledWith(subscription.toJSON());
  });

  test('requests permission only from activation and subscribes with visible notifications', async () => {
    const subscription = makeSubscription();
    const environment = makeEnvironment();
    environment.notification.requestPermission.mockResolvedValue('granted');
    environment.pushManager.subscribe.mockResolvedValue(subscription);
    const syncSubscription = jest.fn().mockResolvedValue(undefined);

    const state = await activateWebPush({
      environment,
      publicKey: 'AQIDBA',
      syncSubscription,
    });

    expect(state).toBe(WebPushStates.ACTIVE);
    expect(environment.notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(environment.pushManager.subscribe).toHaveBeenCalledWith({
      applicationServerKey: new Uint8Array([1, 2, 3, 4]),
      userVisibleOnly: true,
    });
    expect(environment.navigator.serviceWorker.register).toHaveBeenCalledWith(
      '/boards-push-sw.js',
      {
        scope: '/',
        updateViaCache: 'none',
      },
    );
    expect(syncSubscription).toHaveBeenCalledWith(subscription.toJSON());
  });

  test('reports blocked permission without registering the worker', async () => {
    const environment = makeEnvironment({ permission: 'denied' });

    await expect(
      activateWebPush({
        environment,
        publicKey: 'AQIDBA',
        syncSubscription: jest.fn(),
      }),
    ).resolves.toBe(WebPushStates.BLOCKED);

    expect(environment.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  test('classifies a denied Push subscription as blocked instead of a generic error', () => {
    expect(
      getWebPushErrorState(
        new DOMException('Registration failed - permission denied', 'AbortError'),
      ),
    ).toBe(WebPushStates.BLOCKED);
  });

  test('keeps activation inactive when the permission prompt is dismissed', async () => {
    const environment = makeEnvironment();
    environment.notification.requestPermission.mockResolvedValue('default');

    await expect(
      activateWebPush({
        environment,
        publicKey: 'AQIDBA',
        syncSubscription: jest.fn(),
      }),
    ).resolves.toBe(WebPushStates.INACTIVE);

    expect(environment.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  test('always unsubscribes locally when remote removal fails', async () => {
    const subscription = makeSubscription();
    const environment = makeEnvironment({
      permission: 'granted',
      subscription,
    });
    const removeSubscription = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(disableWebPush({ environment, removeSubscription })).rejects.toThrow('offline');
    expect(removeSubscription).toHaveBeenCalledWith(subscription.endpoint);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('logout does not wait for remote removal before unsubscribing locally', async () => {
    const subscription = makeSubscription();
    const environment = makeEnvironment({ permission: 'granted', subscription });
    const removeSubscription = jest.fn(() => new Promise(() => {}));

    await disableWebPushForLogout({ environment, removeSubscription });

    expect(removeSubscription).toHaveBeenCalledWith(subscription.endpoint);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('logout still unsubscribes locally when remote removal throws synchronously', async () => {
    const subscription = makeSubscription();
    const environment = makeEnvironment({ permission: 'granted', subscription });
    const removeSubscription = jest.fn(() => {
      throw new Error('socket unavailable');
    });

    await disableWebPushForLogout({ environment, removeSubscription });

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('shows a local device notification through the registered worker', async () => {
    const environment = makeEnvironment({ permission: 'granted' });
    environment.registration.showNotification = jest.fn().mockResolvedValue(undefined);

    await expect(showWebPushTestNotification(environment)).resolves.toBe(true);
    expect(environment.registration.showNotification).toHaveBeenCalledWith(
      'Boards · Teste de notificação',
      {
        body: 'Teste de notificações neste dispositivo',
        icon: '/logo192.png',
        renotify: true,
        requireInteraction: true,
        silent: false,
        tag: 'boards-web-push-test',
      },
    );
  });
});
