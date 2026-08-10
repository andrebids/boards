import http from './http';
import attachments from './attachments';

jest.mock('./http', () => ({
  post: jest.fn(),
}));

jest.mock('./socket', () => ({
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

describe('attachments API', () => {
  beforeEach(() => {
    http.post.mockReset();
    http.post.mockResolvedValue({
      item: {
        id: 'attachment-1',
      },
    });
  });

  test('sends skipCover in the query for inline comment uploads', async () => {
    const file = { name: 'comment.png' };

    await attachments.createAttachmentWithFile(
      'card-1',
      {
        file,
        type: 'file',
        name: file.name,
        skipCover: true,
      },
      'local:request-1',
      { Authorization: 'Bearer token-1' },
    );

    expect(http.post).toHaveBeenCalledWith(
      '/cards/card-1/attachments?requestId=local:request-1&skipCover=true',
      {
        file,
        type: 'file',
        name: file.name,
      },
      { Authorization: 'Bearer token-1' },
      { timeout: 10 * 60 * 1000 },
    );
  });
});
