import { toast } from 'react-hot-toast';

import http from './http';
import attachments from './attachments';

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
  },
}));

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
    toast.error.mockReset();
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
      { timeout: 60 * 60 * 1000 },
    );
  });

  test('shows the specific server reason when an attachment upload fails', async () => {
    const file = { name: 'photo.heic' };
    const error = new Error(
      'Não foi possível converter a imagem HEIC/HEIF. O ficheiro pode estar danificado.',
    );
    http.post.mockRejectedValueOnce(error);

    await expect(
      attachments.createAttachmentWithFile(
        'card-1',
        {
          file,
          type: 'file',
          name: file.name,
        },
        'local:request-2',
      ),
    ).rejects.toBe(error);

    expect(toast.error).toHaveBeenCalledWith(error.message);
  });
});
