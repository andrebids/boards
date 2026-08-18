import { playChatMessageSound, shouldPlayChatMessageSound } from './chat-message-sound';

describe('chat message sound', () => {
  let originalAudio;

  beforeEach(() => {
    originalAudio = global.Audio;
  });

  afterEach(() => {
    if (originalAudio === undefined) {
      delete global.Audio;
    } else {
      global.Audio = originalAudio;
    }
  });

  it('plays the configured sound at a restrained volume', () => {
    const play = jest.fn().mockResolvedValue();
    global.Audio = jest.fn(() => ({ play }));

    playChatMessageSound();

    expect(global.Audio).toHaveBeenCalledWith('/sounds/chat-message.mp3');
    expect(global.Audio.mock.results[0].value.volume).toBe(0.5);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('does not play messages from the current user or an open conversation', () => {
    expect(
      shouldPlayChatMessageSound(
        { conversationId: 'conversation-1', userId: 'current-user' },
        'current-user',
        [],
        [],
      ),
    ).toBe(false);
    expect(
      shouldPlayChatMessageSound(
        { conversationId: 'conversation-1', userId: 'other-user' },
        'current-user',
        ['conversation-1'],
        [],
      ),
    ).toBe(false);
  });

  it('plays messages in minimized or unopened conversations', () => {
    expect(
      shouldPlayChatMessageSound(
        { conversationId: 'conversation-1', userId: 'other-user' },
        'current-user',
        ['conversation-1'],
        ['conversation-1'],
      ),
    ).toBe(true);
    expect(
      shouldPlayChatMessageSound(
        { conversationId: 'conversation-1', userId: 'other-user' },
        'current-user',
        [],
        [],
      ),
    ).toBe(true);
  });
});
