import {
  BOTTOM_PROXIMITY_THRESHOLD,
  getAddedMessages,
  getMessageIdentities,
  getMessageIdentity,
  isNearBottom,
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
    const currentMessages = [
      { id: '1' },
      { id: '42', clientMessageId: 'client-1' },
    ];

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
});
