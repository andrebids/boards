import {
  BOTTOM_PROXIMITY_THRESHOLD,
  getAddedMessages,
  getReadHorizonMessageId,
  getMessageIdentities,
  getMessageIdentity,
  isNearBottom,
  shouldScrollToNewestMessage,
} from './scroll';

describe('chat message list scroll helpers', () => {
  test('considers the configured tolerance part of the bottom area', () => {
    expect(
      isNearBottom({
        clientHeight: 400,
        scrollHeight: 1000,
        scrollTop: 1000 - 400 - BOTTOM_PROXIMITY_THRESHOLD,
      }),
    ).toBe(true);
    expect(
      isNearBottom({
        clientHeight: 400,
        scrollHeight: 1000,
        scrollTop: 1000 - 400 - BOTTOM_PROXIMITY_THRESHOLD - 1,
      }),
    ).toBe(false);
  });

  test('keeps the newest message in view after the current user sends it', () => {
    expect(
      shouldScrollToNewestMessage({
        isAtBottom: false,
        message: { userId: 'user-1' },
        currentUserId: 'user-1',
      }),
    ).toBe(true);
  });

  test('preserves the reader position for messages from another user', () => {
    expect(
      shouldScrollToNewestMessage({
        isAtBottom: false,
        message: { userId: 'user-2' },
        currentUserId: 'user-1',
      }),
    ).toBe(false);
  });

  test('uses the client message id as the stable optimistic identity', () => {
    const optimisticMessage = {
      id: 'local:1',
      localId: 'local:1',
      clientMessageId: 'client-1',
    };
    const persistedMessage = {
      id: '42',
      clientMessageId: 'client-1',
    };

    expect(getMessageIdentity(optimisticMessage)).toBe('client-1');
    expect(getMessageIdentity(persistedMessage)).toBe('client-1');
  });

  test('does not treat an optimistic server acknowledgement as a new message', () => {
    const previousIdentities = getMessageIdentities([
      { id: '1' },
      { id: 'local:1', localId: 'local:1', clientMessageId: 'client-1' },
    ]);
    const currentMessages = [{ id: '1' }, { id: '42', clientMessageId: 'client-1' }];

    expect(getAddedMessages(previousIdentities, currentMessages)).toEqual([]);
  });

  test('returns every genuinely added message in one update', () => {
    const previousIdentities = getMessageIdentities([{ id: '1' }]);
    const currentMessages = [
      { id: '1' },
      { id: '2', userId: 'user-2' },
      { id: '3', userId: 'user-3' },
    ];

    expect(getAddedMessages(previousIdentities, currentMessages)).toEqual([
      { id: '2', userId: 'user-2' },
      { id: '3', userId: 'user-3' },
    ]);
  });

  test('uses the last persisted message whose end is visible as the read horizon', () => {
    const makeRow = (messageId, top, bottom) => ({
      dataset: { messageId },
      getBoundingClientRect: () => ({ top, bottom }),
    });
    const list = {
      getBoundingClientRect: () => ({ top: 100, bottom: 500 }),
      querySelectorAll: () => [
        makeRow('40', 80, 140),
        makeRow('41', 140, 480),
        makeRow('42', 480, 540),
        makeRow('local:1', 540, 580),
      ],
    };
    const messages = [
      { id: '40', isPersisted: true },
      { id: '41', isPersisted: true },
      { id: '42', isPersisted: true },
      { id: 'local:1', isPersisted: false },
    ];

    expect(getReadHorizonMessageId(list, messages)).toBe('41');
  });
});
