import { clearReturnTo, consumeReturnTo, sanitizeReturnTo, storeReturnTo } from './return-to';

const createStorage = () => {
  const values = new Map();

  return {
    getItem: jest.fn((key) => values.get(key) || null),
    removeItem: jest.fn((key) => values.delete(key)),
    setItem: jest.fn((key, value) => values.set(key, value)),
  };
};

describe('post-authentication return target', () => {
  test.each([
    [
      '/projects/123?chatConversation=456&chatMessage=789&reply=1',
      '/projects/123?chatConversation=456&chatMessage=789&reply=1',
    ],
    ['/boards/123?chatConversation=456', '/boards/123?chatConversation=456'],
    ['/cards/123', '/cards/123'],
  ])('allows an application route %s', (value, expected) => {
    expect(sanitizeReturnTo(value, 'https://boards.example.com')).toBe(expected);
  });

  test.each([
    'https://attacker.example/projects/123',
    '//attacker.example/projects/123',
    '/login?returnTo=/projects/123',
    '/oidc-callback',
    '/api/config',
    'data:text/html,unsafe',
  ])('rejects an unsafe target %s', (value) => {
    expect(sanitizeReturnTo(value, 'https://boards.example.com')).toBeNull();
  });

  test('stores and consumes a valid target once', () => {
    const storage = createStorage();
    const target = '/projects/123?chatConversation=456&reply=1';

    expect(storeReturnTo(target, storage, 'https://boards.example.com')).toBe(true);
    expect(consumeReturnTo(storage, 'https://boards.example.com')).toBe(target);
    expect(consumeReturnTo(storage, 'https://boards.example.com')).toBeNull();
  });

  test('clears an invalid persisted target', () => {
    const storage = createStorage();
    storage.setItem('boards-return-to', 'https://attacker.example/steal');

    expect(consumeReturnTo(storage, 'https://boards.example.com')).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('boards-return-to');
  });

  test('can explicitly clear the target', () => {
    const storage = createStorage();

    clearReturnTo(storage);

    expect(storage.removeItem).toHaveBeenCalledWith('boards-return-to');
  });

  test('falls back safely when session storage is unavailable', () => {
    expect(storeReturnTo('/projects/123', null, 'https://boards.example.com')).toBe(false);
    expect(consumeReturnTo(null, 'https://boards.example.com')).toBeNull();
    expect(() => clearReturnTo(null)).not.toThrow();
  });

  test('does not interrupt authentication when storage access fails', () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: jest.fn(() => {
        throw new Error('blocked');
      }),
      setItem: jest.fn(() => {
        throw new Error('blocked');
      }),
    };

    expect(storeReturnTo('/projects/123', storage, 'https://boards.example.com')).toBe(false);
    expect(consumeReturnTo(storage, 'https://boards.example.com')).toBeNull();
    expect(() => clearReturnTo(storage)).not.toThrow();
  });
});
