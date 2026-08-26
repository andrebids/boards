import { consumeReplyIntent } from './deep-link';

describe('chat reply deep link', () => {
  test('consumes reply intent for the matching conversation and preserves the message target', () => {
    const location = {
      hash: '',
      pathname: '/projects/project-1',
      search: '?chatConversation=conversation-1&chatMessage=message-1&reply=1',
    };
    const history = { replaceState: jest.fn() };

    expect(consumeReplyIntent('conversation-1', location, history)).toBe(true);
    expect(history.replaceState).toHaveBeenCalledWith(
      undefined,
      '',
      '/projects/project-1?chatConversation=conversation-1&chatMessage=message-1',
    );
  });

  test.each([
    ['another-conversation', '?chatConversation=conversation-1&reply=1'],
    ['conversation-1', '?chatConversation=conversation-1'],
    ['conversation-1', '?chatConversation=conversation-1&reply=0'],
  ])('does not consume a non-matching intent', (conversationId, search) => {
    const history = { replaceState: jest.fn() };

    expect(
      consumeReplyIntent(
        conversationId,
        { hash: '', pathname: '/projects/project-1', search },
        history,
      ),
    ).toBe(false);
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
