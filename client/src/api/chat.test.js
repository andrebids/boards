import http from './http';
import chat from './chat';

jest.mock('./http', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('./socket', () => ({
  __esModule: true,
  default: {},
}));

describe('chat attachment API', () => {
  test('sends the stable client id and transforms the attachment response', async () => {
    http.post.mockResolvedValue({
      messageId: 'message-1',
      item: {
        id: 'attachment-1',
        clientAttachmentId: 'client-attachment-1',
        createdAt: '2026-08-20T10:00:00.000Z',
      },
    });

    const result = await chat.createChatMessageAttachment(
      'message-1',
      {
        file: 'file-1',
        clientAttachmentId: 'client-attachment-1',
      },
      { Authorization: 'Bearer token' },
    );

    expect(http.post).toHaveBeenCalledWith(
      '/chat-messages/message-1/attachments',
      { clientAttachmentId: 'client-attachment-1', file: 'file-1' },
      {
        Authorization: 'Bearer token',
        'X-Client-Attachment-Id': 'client-attachment-1',
      },
      { timeout: 10 * 60 * 1000 },
    );
    expect(result.item.createdAt).toEqual(new Date('2026-08-20T10:00:00.000Z'));
    expect(result.messageId).toBe('message-1');
  });

  test('transforms attachment socket events', () => {
    const next = jest.fn();
    const handle = chat.makeHandleChatMessageAttachmentCreate(next);

    handle({
      messageId: 'message-1',
      item: { id: 'attachment-1', createdAt: '2026-08-20T10:00:00.000Z' },
    });

    expect(next).toHaveBeenCalledWith({
      messageId: 'message-1',
      item: { id: 'attachment-1', createdAt: new Date('2026-08-20T10:00:00.000Z') },
    });
  });
});
