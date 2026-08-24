import getVideoThumbnailState from './get-video-thumbnail-state';

describe('getVideoThumbnailState', () => {
  test.each(['pending', 'processing'])(
    'keeps a video in the processing state while its status is %s',
    (status) => {
      expect(
        getVideoThumbnailState({
          status,
          thumbnailUrl: null,
          hasError: false,
        }),
      ).toBe('processing');
    },
  );

  test('shows the preview when processing finishes and a thumbnail is available', () => {
    expect(
      getVideoThumbnailState({
        status: 'ready',
        thumbnailUrl: '/attachments/video-thumbnail.png',
        hasError: false,
      }),
    ).toBe('ready');
  });

  test.each([
    ['the video processing fails', 'failed', null, false],
    ['the thumbnail request fails', 'ready', '/attachments/video-thumbnail.png', true],
  ])('shows an error when %s', (_, status, thumbnailUrl, hasError) => {
    expect(
      getVideoThumbnailState({
        status,
        thumbnailUrl,
        hasError,
      }),
    ).toBe('error');
  });

  test('only reports an unavailable preview after processing has finished', () => {
    expect(
      getVideoThumbnailState({
        status: 'ready',
        thumbnailUrl: null,
        hasError: false,
      }),
    ).toBe('unavailable');
  });
});
