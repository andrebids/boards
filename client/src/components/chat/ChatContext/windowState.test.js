import createInitialChatWindows, {
  getOverflowChatWindowIds,
  setChatWindowMinimized,
} from './windowState';

describe('chat window state', () => {
  test('starts empty instead of restoring windows from an earlier session', () => {
    const getItem = jest.fn(() =>
      JSON.stringify([{ id: 'stale-conversation', isMinimized: false }]),
    );
    global.localStorage = { getItem };

    expect(createInitialChatWindows()).toEqual([]);
    expect(getItem).not.toHaveBeenCalled();
  });

  test('keeps an overflowed conversation minimized when another panel closes', () => {
    const windows = [
      { id: 'general', isMinimized: false },
      { id: 'joao', isMinimized: false },
      { id: 'marta', isMinimized: false },
    ];
    const [overflowId] = getOverflowChatWindowIds(windows, 2);
    const minimizedWindows = setChatWindowMinimized(windows, overflowId, true);
    const remainingWindows = minimizedWindows.filter(({ id }) => id !== 'marta');

    expect(overflowId).toBe('general');
    expect(remainingWindows).toEqual([
      { id: 'general', isMinimized: true },
      { id: 'joao', isMinimized: false },
    ]);
    expect(getOverflowChatWindowIds(remainingWindows, 2)).toEqual([]);
  });
});
