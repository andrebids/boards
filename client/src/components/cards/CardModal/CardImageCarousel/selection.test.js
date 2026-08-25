import getDefaultMedia, { getNewlyAddedMedia } from './selection';

describe('getDefaultMedia', () => {
  const olderCover = {
    id: 'cover',
    createdAt: new Date('2026-08-01T10:00:00Z'),
  };
  const latestAttachment = {
    id: 'latest',
    createdAt: new Date('2026-08-10T10:00:00Z'),
  };

  test('prefers the card cover over the latest attachment', () => {
    expect(getDefaultMedia([olderCover, latestAttachment], olderCover.id)).toBe(olderCover);
  });

  test('uses the latest attachment when the card has no valid cover', () => {
    expect(getDefaultMedia([olderCover, latestAttachment], 'missing')).toBe(latestAttachment);
  });

  test('returns null when the card has no visual attachments', () => {
    expect(getDefaultMedia([], olderCover.id)).toBeNull();
  });
});

describe('getNewlyAddedMedia', () => {
  const existingImage = {
    id: 'existing',
    creatorUserId: 'user-1',
  };
  const uploadedImage = {
    id: 'uploaded',
    creatorUserId: 'user-1',
  };

  test('selects a newly persisted image uploaded by the current user', () => {
    expect(getNewlyAddedMedia([existingImage, uploadedImage], [existingImage.id], 'user-1')).toBe(
      uploadedImage,
    );
  });

  test('ignores media that was already present or belongs to another user', () => {
    expect(getNewlyAddedMedia([existingImage], [existingImage.id], 'user-1')).toBeNull();
    expect(
      getNewlyAddedMedia(
        [existingImage, { id: 'another-user-image', creatorUserId: 'user-2' }],
        [existingImage.id],
        'user-1',
      ),
    ).toBeNull();
  });
});
