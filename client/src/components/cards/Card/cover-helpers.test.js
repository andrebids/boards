import getCoverThumbnailUrl from './cover-helpers';

describe('getCoverThumbnailUrl', () => {
  test.each([
    ['missing attachment', undefined],
    ['pending attachment without data', { id: 'local:attachment' }],
    ['attachment without thumbnails', { data: { video: {} } }],
    ['attachment with empty thumbnails', { data: { thumbnailUrls: {} } }],
  ])('returns null for %s', (_, attachment) => {
    expect(getCoverThumbnailUrl(attachment)).toBeNull();
  });

  test('returns the outside360 thumbnail when it is available', () => {
    expect(
      getCoverThumbnailUrl({
        data: {
          thumbnailUrls: {
            outside360: '/attachments/video-thumbnail.jpg',
          },
        },
      }),
    ).toBe('/attachments/video-thumbnail.jpg');
  });
});
