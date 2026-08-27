import {
  getMessageAlertPresentation,
  getMessagePreviewText,
  getQuickReplyText,
  shouldShowMessagePreview,
} from './preview';

describe('chat launcher message preview', () => {
  const t = (key) => key;

  test('shows only for conversations that are not already open', () => {
    const alert = { conversationId: 'conversation-1' };

    expect(shouldShowMessagePreview(alert, [], false)).toBe(true);
    expect(
      shouldShowMessagePreview(alert, [{ id: 'conversation-1', isMinimized: true }], false),
    ).toBe(false);
    expect(shouldShowMessagePreview(alert, [], true)).toBe(false);
  });

  test('uses the updated conversation message as the preview', () => {
    expect(getMessagePreviewText({ text: 'Olá do João' }, t)).toBe('Olá do João');
    expect(getMessagePreviewText({ text: '', attachments: [{ id: 'file-1' }] }, t)).toBe(
      'chat.sentFile',
    );
  });

  test('does not present the same alert after its conversation window closes', () => {
    const alert = { conversationId: 'conversation-1', messageId: 'message-1' };
    const whileOpen = getMessageAlertPresentation(alert, null, [{ id: 'conversation-1' }], false);

    expect(whileOpen).toMatchObject({
      isNew: true,
      messageId: 'message-1',
      shouldPresent: false,
    });

    const afterClosing = getMessageAlertPresentation(alert, whileOpen.messageId, [], false);
    expect(afterClosing).toMatchObject({ isNew: false, shouldPresent: false });

    const nextMessage = getMessageAlertPresentation(
      { ...alert, messageId: 'message-2' },
      afterClosing.messageId,
      [],
      false,
    );
    expect(nextMessage).toMatchObject({ isNew: true, shouldPresent: true });
  });

  test('normalizes a notification quick reply and rejects blank messages', () => {
    expect(getQuickReplyText('  Sim, combinado.  ')).toBe('Sim, combinado.');
    expect(getQuickReplyText('   ')).toBeNull();
  });
});
