import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_ATTACHMENT_ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_MAX_BYTES,
  getChatAttachmentExtension,
  isChatAttachmentAllowed,
  isChatAttachmentTooLarge,
} from './attachmentPolicy';

describe('chat attachment policy', () => {
  test('allows the supported business and media formats', () => {
    expect(isChatAttachmentAllowed({ name: 'brief.PDF' })).toBeTruthy();
    expect(isChatAttachmentAllowed({ name: 'proposal.docx' })).toBeTruthy();
    expect(isChatAttachmentAllowed({ name: 'screenshot.png' })).toBeTruthy();
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

  test('rejects any attachment larger than 25 MiB before upload', () => {
    expect(
      isChatAttachmentTooLarge({ name: 'clip.mp4', size: CHAT_ATTACHMENT_MAX_BYTES }),
    ).toBeFalsy();
    expect(
      isChatAttachmentTooLarge({ name: 'clip.mov', size: CHAT_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBeTruthy();
    expect(
      isChatAttachmentTooLarge({ name: 'document.pdf', size: CHAT_ATTACHMENT_MAX_BYTES + 1 }),
    ).toBeTruthy();
  });
});
