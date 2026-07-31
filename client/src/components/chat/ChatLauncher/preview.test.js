import { getMessagePreviewText, shouldShowMessagePreview } from './preview';

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
});
