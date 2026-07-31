import createInitialChatWindows from './windowState';

describe('chat window state', () => {
  test('starts empty instead of restoring windows from an earlier session', () => {
    const getItem = jest.fn(() =>
      JSON.stringify([{ id: 'stale-conversation', isMinimized: false }]),
    );
    global.localStorage = { getItem };

    expect(createInitialChatWindows()).toEqual([]);
    expect(getItem).not.toHaveBeenCalled();
  });
});
