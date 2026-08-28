import {
  classifyMessageAttachments,
  createMemberNameById,
  getMessageGrouping,
  isEmojiOnlyMessage,
} from './message-view';

describe('chat message presentation', () => {
  test('groups consecutive messages from the same author within five minutes', () => {
    const previousMessage = {
      userId: 'user-1',
      createdAt: '2026-08-28T10:00:00.000Z',
    };
    const message = {
      userId: 'user-1',
      createdAt: '2026-08-28T10:04:59.000Z',
    };
    const nextMessage = {
      userId: 'user-1',
      createdAt: '2026-08-28T10:09:59.000Z',
    };

    expect(getMessageGrouping(message, previousMessage, nextMessage)).toEqual({
      continuesNext: false,
      continuesPrevious: true,
      startsNewDay: false,
    });
  });

  test('starts a new group at the five-minute boundary and on a new day', () => {
    const previousMessage = {
      userId: 'user-1',
      createdAt: '2026-08-27T23:59:00',
    };
    const message = {
      userId: 'user-1',
      createdAt: '2026-08-28T00:04:00',
    };

    expect(getMessageGrouping(message, previousMessage)).toEqual({
      continuesNext: false,
      continuesPrevious: false,
      startsNewDay: true,
    });
  });

  test.each([
    ['👍', true],
    ['👨‍👩‍👧‍👦 🎉', true],
    ['🇵🇹 1️⃣ ❤️', true],
    ['😀 😀 😀 😀', false],
    ['olá 👋', false],
    ['', false],
  ])('classifies emoji-only text %p', (text, expected) => {
    expect(isEmojiOnlyMessage(text)).toBe(expected);
  });

  test('separates image attachments and hides attachments from deleted messages', () => {
    const image = { id: 'image-1', data: { image: true } };
    const file = { id: 'file-1', data: { mimeType: 'application/pdf' } };

    expect(classifyMessageAttachments({ attachments: [image, file] })).toEqual({
      imageAttachments: [image],
      otherAttachments: [file],
    });
    expect(
      classifyMessageAttachments({
        deletedAt: '2026-08-28T10:00:00.000Z',
        attachments: [image],
      }),
    ).toEqual({ imageAttachments: [], otherAttachments: [] });
  });

  test('indexes member names once for reply author lookups', () => {
    expect(
      createMemberNameById([
        { id: 'user-1', name: 'Ana' },
        { id: 'user-2', name: 'Bruno' },
      ]).get('user-2'),
    ).toBe('Bruno');
  });
});
