import fs from 'fs';
import path from 'path';
import vm from 'vm';

const loadWorker = ({ clients = [], maxActions = 0 } = {}) => {
  const handlers = {};
  const showNotification = jest.fn().mockResolvedValue(undefined);
  const openWindow = jest.fn().mockResolvedValue(undefined);
  const scope = {
    Notification: { maxActions },
    URL,
    clients: {
      matchAll: jest.fn().mockResolvedValue(clients),
      openWindow,
    },
    location: { origin: 'https://boards.example.test' },
    registration: { showNotification },
    addEventListener: (name, handler) => {
      handlers[name] = handler;
    },
  };
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'boards-push-sw.js'), 'utf8');

  vm.runInNewContext(source, { self: scope, URL, URLSearchParams, Promise });
  return { handlers, openWindow, showNotification };
};

const dispatchExtendableEvent = async (handler, event) => {
  let pending;
  handler({
    ...event,
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
};

describe('Boards push service worker', () => {
  test('always displays a generic visible notification for an invalid payload', async () => {
    const { handlers, showNotification } = loadWorker();

    await dispatchExtendableEvent(handlers.push, {
      data: { json: () => ({ url: 'https://attacker.test' }) },
    });

    expect(showNotification).toHaveBeenCalledWith(
      'Boards',
      expect.objectContaining({
        body: 'You have a new chat message.',
        tag: 'boards-chat',
      }),
    );
  });

  test('groups valid notifications by conversation and adds reply progressively', async () => {
    const { handlers, showNotification } = loadWorker({ maxActions: 2 });

    await dispatchExtendableEvent(handlers.push, {
      data: {
        json: () => ({
          version: 1,
          title: 'Ana in General',
          body: 'Can you check this?',
          projectId: '11',
          conversationId: '22',
          messageId: '33',
          replyActionLabel: 'Reply',
        }),
      },
    });

    expect(showNotification).toHaveBeenCalledWith(
      'Ana in General',
      expect.objectContaining({
        actions: [{ action: 'reply', title: 'Reply' }],
        renotify: true,
        tag: 'boards-chat-22',
      }),
    );
  });

  test('constructs a same-origin reply route from validated ids', async () => {
    const { handlers, openWindow } = loadWorker();

    await dispatchExtendableEvent(handlers.notificationclick, {
      action: 'reply',
      notification: {
        close: jest.fn(),
        data: { projectId: '11', conversationId: '22', messageId: '33' },
      },
    });

    expect(openWindow).toHaveBeenCalledWith(
      'https://boards.example.test/projects/11?chatConversation=22&chatMessage=33&reply=1',
    );
  });

  test('navigates and focuses an existing Boards window', async () => {
    const existingWindow = {
      url: 'https://boards.example.test/projects/44',
      navigate: jest.fn().mockResolvedValue(undefined),
      focus: jest.fn().mockResolvedValue(undefined),
    };
    const { handlers, openWindow } = loadWorker({ clients: [existingWindow] });

    await dispatchExtendableEvent(handlers.notificationclick, {
      action: '',
      notification: {
        close: jest.fn(),
        data: { projectId: '11', conversationId: '22', messageId: '33' },
      },
    });

    expect(existingWindow.navigate).toHaveBeenCalledWith(
      'https://boards.example.test/projects/11?chatConversation=22&chatMessage=33',
    );
    expect(existingWindow.focus).toHaveBeenCalledTimes(1);
    expect(openWindow).not.toHaveBeenCalled();
  });
});
