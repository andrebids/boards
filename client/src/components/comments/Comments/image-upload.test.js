import api from '../../../api';
import { uploadCommentImage } from './image-upload';

jest.mock('../../../api', () => ({
  createAttachmentWithFile: jest.fn(),
}));

describe('comment image upload', () => {
  beforeEach(() => {
    api.createAttachmentWithFile.mockReset();
  });

  test('uploads the image as an attachment and returns its thumbnail URL', async () => {
    const file = { name: 'capture.png', type: 'image/png' };
    const attachment = {
      id: 'attachment-1',
      data: {
        url: 'http://localhost/attachments/attachment-1/download/capture.png',
        thumbnailUrls: {
          outside360: 'http://localhost/attachments/attachment-1/thumb-360.png',
          outside720: 'http://localhost/attachments/attachment-1/thumb-720.png',
        },
      },
    };

    api.createAttachmentWithFile.mockResolvedValue({ item: attachment });

    const result = await uploadCommentImage({
      cardId: 'card-1',
      accessToken: 'token-1',
      file,
    });

    expect(api.createAttachmentWithFile).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        file,
        name: 'capture.png',
        skipCover: true,
      }),
      expect.stringMatching(/^local:/),
      { Authorization: 'Bearer token-1' },
    );
    expect(result).toEqual(
      expect.objectContaining({
        attachment,
        url: attachment.data.thumbnailUrls.outside720,
      }),
    );
  });

  test('falls back to the original attachment URL when no thumbnail exists', async () => {
    const attachment = {
      id: 'attachment-2',
      data: {
        url: 'http://localhost/attachments/attachment-2/download/capture.gif',
        thumbnailUrls: null,
      },
    };

    api.createAttachmentWithFile.mockResolvedValue({ item: attachment });

    const result = await uploadCommentImage({
      cardId: 'card-1',
      accessToken: 'token-1',
      file: { name: 'capture.gif', type: 'image/gif' },
    });

    expect(result.url).toBe(attachment.data.url);
  });
});
