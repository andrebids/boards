import {
  getClipboardImageFiles,
  getConversationTitle,
  getDirectUser,
  getParticipantUserIds,
  getChatParticipantMuteExpiration,
  hasUnreadMessages,
  isChatParticipantMentionsOnly,
  isChatParticipantMuted,
  isChatParticipantPinned,
  isDirectConversation,
  isGeneralConversation,
  prepareChatAttachmentFiles,
  shouldConcealChatDock,
} from './utils';

const members = [
  { id: '1', name: 'Ana' },
  { id: '2', name: 'Bruno' },
];

const labels = {
  conversationTitle: 'Conversa',
  generalTitle: 'Geral',
};

describe('chat utils', () => {
  test('distinguishes a direct conversation from a custom group', () => {
    expect(isDirectConversation({ type: 'projectDirect' })).toBeTruthy();
    expect(isDirectConversation({ type: 'projectCustomGroup' })).toBeFalsy();
  });

  test('recognizes the project group conversation', () => {
    expect(isGeneralConversation({ type: 'projectGroup' })).toBeTruthy();
    expect(isGeneralConversation({ type: 'projectDirect' })).toBeFalsy();
  });

  test('uses the conversation default until the participant chooses a pinned state', () => {
    expect(isChatParticipantPinned()).toBeFalsy();
    expect(isChatParticipantPinned(undefined, true)).toBeTruthy();
    expect(isChatParticipantPinned({ isPinned: null })).toBeFalsy();
    expect(isChatParticipantPinned({ isPinned: null }, true)).toBeTruthy();
    expect(isChatParticipantPinned({ isPinned: true })).toBeTruthy();
    expect(isChatParticipantPinned({ isPinned: false })).toBeFalsy();
  });

  test('recognizes unread conversations from their unread count', () => {
    expect(hasUnreadMessages()).toBeFalsy();
    expect(hasUnreadMessages({ unreadCount: 0 })).toBeFalsy();
    expect(hasUnreadMessages({ unreadCount: 1 })).toBeTruthy();
  });

  test('reveals the chat dock while the conversation list is closing', () => {
    expect(shouldConcealChatDock(true, false)).toBeTruthy();
    expect(shouldConcealChatDock(true, true)).toBeFalsy();
    expect(shouldConcealChatDock(false, false)).toBeFalsy();
  });

  test('derives temporary and permanent mute states from notification preferences', () => {
    const now = Date.parse('2026-07-14T12:00:00.000Z');
    const temporaryMute = {
      notificationLevel: 'all',
      mutedUntil: '2026-07-14T13:00:00.000Z',
    };

    expect(getChatParticipantMuteExpiration(temporaryMute)).toBe(
      Date.parse(temporaryMute.mutedUntil),
    );
    expect(isChatParticipantMuted(temporaryMute, now)).toBeTruthy();
    expect(isChatParticipantMuted(temporaryMute, Date.parse(temporaryMute.mutedUntil))).toBeFalsy();
    expect(
      isChatParticipantMuted({ notificationLevel: 'none', mutedUntil: null }, now),
    ).toBeTruthy();
  });

  test('ignores stale or invalid temporary mute dates', () => {
    const now = Date.parse('2026-07-14T12:00:00.000Z');

    expect(
      isChatParticipantMuted(
        {
          notificationLevel: 'all',
          mutedUntil: '2026-07-14T11:59:59.999Z',
          isMuted: true,
        },
        now,
      ),
    ).toBeFalsy();
    expect(
      isChatParticipantMuted(
        { notificationLevel: 'all', mutedUntil: 'invalid', isMuted: true },
        now,
      ),
    ).toBeFalsy();
  });

  test('distinguishes mentions-only notifications from mute states', () => {
    const now = Date.parse('2026-07-14T12:00:00.000Z');

    expect(
      isChatParticipantMentionsOnly({ notificationLevel: 'mentions', mutedUntil: null }, now),
    ).toBeTruthy();
    expect(
      isChatParticipantMentionsOnly(
        {
          notificationLevel: 'mentions',
          mutedUntil: '2026-07-14T13:00:00.000Z',
        },
        now,
      ),
    ).toBeFalsy();
    expect(
      isChatParticipantMentionsOnly({ notificationLevel: 'all', mutedUntil: null }, now),
    ).toBeFalsy();
  });

  test('extracts images pasted from clipboard files', () => {
    const image = { name: 'screenshot.png', type: 'image/png' };
    const document = { name: 'notes.txt', type: 'text/plain' };

    expect(getClipboardImageFiles({ files: [image, document] })).toEqual([image]);
  });

  test('extracts clipboard images from items when files are unavailable', () => {
    const image = { name: 'screenshot.png', type: 'image/png' };

    expect(
      getClipboardImageFiles({
        files: [],
        items: [
          { kind: 'string', type: 'text/plain' },
          { kind: 'file', type: 'image/png', getAsFile: () => image },
        ],
      }),
    ).toEqual([image]);
  });

  test('does not convert PNG attachments below 10 MiB', async () => {
    const screenshot = new File([new Uint8Array(10 * 1024 * 1024 - 1)], 'screenshot.png', {
      type: 'image/png',
    });
    const convertImage = jest.fn(
      async () => new Blob([new Uint8Array(256 * 1024)], { type: 'image/webp' }),
    );

    const [preparedFile] = await prepareChatAttachmentFiles([screenshot], convertImage);

    expect(preparedFile).toBe(screenshot);
    expect(convertImage).not.toHaveBeenCalled();
  });

  test('replaces large PNG attachments with a smaller WebP while preserving order', async () => {
    const screenshot = new File([new Uint8Array(10 * 1024 * 1024)], 'screenshot.png', {
      type: 'image/png',
      lastModified: 123,
    });
    const document = new File(['notes'], 'notes.txt', { type: 'text/plain' });
    const convertImage = jest.fn(
      async () => new Blob([new Uint8Array(256 * 1024)], { type: 'image/webp' }),
    );

    const preparedFiles = await prepareChatAttachmentFiles([screenshot, document], convertImage);

    expect(preparedFiles[0]).toEqual(
      expect.objectContaining({
        name: 'screenshot.webp',
        size: 256 * 1024,
        type: 'image/webp',
        lastModified: 123,
      }),
    );
    expect(preparedFiles[1]).toBe(document);
    expect(convertImage).toHaveBeenCalledTimes(1);
    expect(convertImage).toHaveBeenCalledWith(screenshot);
  });

  test('replaces large JPEG attachments with a smaller WebP', async () => {
    const photo = new File([new Uint8Array(10 * 1024 * 1024)], 'iphone-photo.JPEG', {
      type: 'image/jpeg',
      lastModified: 456,
    });
    const convertImage = jest.fn(
      async () => new Blob([new Uint8Array(512 * 1024)], { type: 'image/webp' }),
    );

    const [preparedFile] = await prepareChatAttachmentFiles([photo], convertImage);

    expect(preparedFile).toEqual(
      expect.objectContaining({
        name: 'iphone-photo.webp',
        size: 512 * 1024,
        type: 'image/webp',
        lastModified: 456,
      }),
    );
    expect(convertImage).toHaveBeenCalledWith(photo);
  });

  test('keeps PNG attachments when WebP conversion does not reduce their size', async () => {
    const screenshot = new File([new Uint8Array(10 * 1024 * 1024)], 'screenshot.png', {
      type: 'image/png',
    });
    const convertImage = jest.fn(
      async () => new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'image/webp' }),
    );

    const [preparedFile] = await prepareChatAttachmentFiles([screenshot], convertImage);

    expect(preparedFile).toBe(screenshot);
  });

  test('does not convert small PNGs and falls back to the original when conversion fails', async () => {
    const smallScreenshot = new File([new Uint8Array(512 * 1024)], 'small.png', {
      type: 'image/png',
    });
    const largeScreenshot = new File([new Uint8Array(10 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    const convertImage = jest.fn(async () => {
      throw new Error('canvas unavailable');
    });

    const preparedFiles = await prepareChatAttachmentFiles(
      [smallScreenshot, largeScreenshot],
      convertImage,
    );

    expect(preparedFiles).toEqual([smallScreenshot, largeScreenshot]);
    expect(convertImage).toHaveBeenCalledTimes(1);
    expect(convertImage).toHaveBeenCalledWith(largeScreenshot);
  });

  test('normalizes participant records to user ids', () => {
    expect(
      getParticipantUserIds({
        participants: [{ userId: '1' }, { userId: '2' }],
      }),
    ).toEqual(['1', '2']);
  });

  test('resolves the other participant in a direct conversation', () => {
    const conversation = {
      type: 'projectDirect',
      participantUserIds: ['1', '2'],
    };

    expect(getDirectUser(conversation, members, '1')).toEqual(members[1]);
    expect(getConversationTitle(conversation, members, '1', 'Projeto', labels)).toBe('Bruno');
  });

  test('does not resolve a participant as the user of the general conversation', () => {
    const andre = {
      id: '1',
      name: 'André',
      avatar: {
        thumbnailUrls: {
          cover180: '/user-avatars/andre.jpg',
        },
      },
    };
    const conversation = {
      type: 'projectGroup',
      participantUserIds: ['1', '2'],
    };

    expect(getDirectUser(conversation, [andre, members[1]], '2')).toBeUndefined();
  });

  test('resolves a former project member included with the conversation', () => {
    const formerMember = { id: '3', name: 'Carla' };
    const conversation = {
      type: 'projectDirect',
      participantUserIds: ['1', '3'],
      participantUsers: [members[0], formerMember],
    };

    expect(getDirectUser(conversation, members, '1')).toEqual(formerMember);
    expect(getConversationTitle(conversation, members, '1', 'Projeto', labels)).toBe('Carla');
  });

  test('uses the project name for the general conversation title', () => {
    expect(getConversationTitle({ type: 'projectGroup' }, members, '1', 'Lançamento', labels)).toBe(
      'Geral — Lançamento',
    );
  });
});
