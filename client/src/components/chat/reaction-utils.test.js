import { getReactionEmojiPickerPosition, QUICK_REACTION_EMOJIS } from './reaction-utils';

describe('reaction utilities', () => {
  it('keeps the emoji picker inside the viewport', () => {
    global.window = { innerWidth: 320, innerHeight: 480 };
    const element = {
      getBoundingClientRect: () => ({
        top: 20,
        right: 314,
        bottom: 48,
        left: 288,
      }),
    };

    expect(getReactionEmojiPickerPosition(element, 280, 350)).toEqual({
      left: 28,
      top: 56,
    });

    delete global.window;
  });

  it('shares the chat quick reactions', () => {
    expect(QUICK_REACTION_EMOJIS).toEqual(['👍', '❤️', '😂', '😮']);
  });
});
