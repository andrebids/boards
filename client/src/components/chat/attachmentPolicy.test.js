import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_ATTACHMENT_ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_MAX_BYTES,
  PSD_ATTACHMENT_MAX_BYTES,
  VIDEO_ATTACHMENT_MAX_BYTES,
  getChatAttachmentMaxBytes,
  getChatAttachmentExtension,
  isChatAttachmentAllowed,
  isChatPsdAttachment,
  isChatVideoAttachment,
  isChatAttachmentTooLarge,
} from './attachmentPolicy';

describe('chat attachment policy', () => {
  test('allows the supported business and media formats', () => {
    expect(isChatAttachmentAllowed({ name: 'brief.PDF' })).toBeTruthy();
    expect(isChatAttachmentAllowed({ name: 'proposal.docx' })).toBeTruthy();
    expect(isChatAttachmentAllowed({ name: 'screenshot.png' })).toBeTruthy();
    expect(isChatAttachmentAllowed({ name: 'design.psd' })).toBeTruthy();
    expect(CHAT_ATTACHMENT_ACCEPT).toContain('.xlsx');
  });

  test('rejects executable, script, archive and macro-enabled formats', () => {
    ['payload.exe', 'script.js', 'vector.svg', 'archive.zip', 'invoice.docm'].forEach((name) => {
      expect(isChatAttachmentAllowed({ name })).toBeFalsy();
    });
    expect(CHAT_ATTACHMENT_ALLOWED_EXTENSIONS).not.toContain('exe');
  });

  test('rejects dangerous double extensions', () => {
    expect(isChatAttachmentAllowed({ name: 'invoice.exe.pdf' })).toBeFalsy();
    expect(isChatAttachmentAllowed({ name: 'photo.jpg.cmd.txt' })).toBeFalsy();
    expect(isChatAttachmentAllowed({ name: 'release.notes.txt' })).toBeTruthy();
  });

  test('requires a real final extension', () => {
    expect(getChatAttachmentExtension('README')).toBeNull();
    expect(getChatAttachmentExtension('report.')).toBeNull();
    expect(isChatAttachmentAllowed({ name: 'README' })).toBeFalsy();
  });

  test('rejects regular attachments larger than 25 MiB before upload', () => {
    expect(
      isChatAttachmentTooLarge({ name: 'document.pdf', size: CHAT_ATTACHMENT_MAX_BYTES }),
    ).toBeFalsy();
    expect(
      isChatAttachmentTooLarge({ name: 'document.pdf', size: CHAT_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBeTruthy();
  });

  test('allows PSD attachments up to 500 MiB before upload', () => {
    expect(isChatPsdAttachment({ name: 'design.PSD' })).toBeTruthy();
    expect(
      isChatAttachmentTooLarge({ name: 'design.psd', size: PSD_ATTACHMENT_MAX_BYTES }),
    ).toBeFalsy();
    expect(
      isChatAttachmentTooLarge({ name: 'design.psd', size: PSD_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBeTruthy();
  });

  test('allows MP4 attachments up to 250 MiB before upload', () => {
    const file = { name: 'video.MP4', size: VIDEO_ATTACHMENT_MAX_BYTES };

    expect(isChatVideoAttachment(file)).toBeTruthy();
    expect(getChatAttachmentMaxBytes(file)).toBe(VIDEO_ATTACHMENT_MAX_BYTES);
    expect(isChatAttachmentTooLarge(file)).toBeFalsy();
    expect(
      isChatAttachmentTooLarge({ ...file, size: VIDEO_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBeTruthy();
  });

  test('uses attachment limits received from the server', () => {
    expect(
      isChatAttachmentTooLarge(
        { name: 'video.mp4', size: 101 },
        { default: 25, psd: 50, video: 100 },
      ),
    ).toBeTruthy();
    expect(
      isChatAttachmentTooLarge(
        { name: 'design.psd', size: 51 },
        { default: 25, psd: 50, video: 100 },
      ),
    ).toBeTruthy();
    expect(
      isChatAttachmentTooLarge(
        { name: 'document.pdf', size: 26 },
        { default: 25, psd: 50, video: 100 },
      ),
    ).toBeTruthy();
  });
});
