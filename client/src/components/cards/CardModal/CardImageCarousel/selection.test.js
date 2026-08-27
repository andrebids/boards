import getDefaultMedia, {
  getCarouselAttachments,
  getNewlyAddedMedia,
  getSpreadsheetPreviewStatus,
  getThreeDFormat,
  isCoverableAttachment,
  isDownloadableAttachment,
  isPersistedAttachment,
} from './selection';

describe('getCarouselAttachments', () => {
  const image = {
    id: 'image',
    isPersisted: true,
  };
  const document = {
    id: 'document',
    isPersisted: true,
  };
  const link = {
    id: 'link',
    isPersisted: true,
  };
  const uploading = {
    id: 'local:uploading',
    isPersisted: false,
  };

  test('keeps every attachment type in the player', () => {
    expect(getCarouselAttachments([document, link, uploading], null)).toEqual([
      document,
      link,
      uploading,
    ]);
  });

  test('places the card cover first without removing other attachments', () => {
    expect(getCarouselAttachments([document, image, link], image.id)).toEqual([
      image,
      document,
      link,
    ]);
  });
});

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

describe('attachment actions', () => {
  test('allows a bounded XLSX preview by filename or MIME type', () => {
    expect(
      getSpreadsheetPreviewStatus({
        name: 'report.xlsx',
        data: { sizeInBytes: 1024 },
      }),
    ).toBe('ready');
    expect(
      getSpreadsheetPreviewStatus({
        name: 'report',
        data: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sizeInBytes: 1024,
        },
      }),
    ).toBe('ready');
  });

  test('rejects unsupported and oversized spreadsheet previews', () => {
    expect(
      getSpreadsheetPreviewStatus({
        name: 'legacy.xls',
        data: { sizeInBytes: 1024 },
      }),
    ).toBeNull();
    expect(
      getSpreadsheetPreviewStatus({
        name: 'large.xlsx',
        data: { sizeInBytes: 5 * 1024 * 1024 + 1 },
      }),
    ).toBe('tooBig');
  });

  test('detects the supported 3D attachment formats by filename', () => {
    expect(getThreeDFormat({ name: 'tree.OBJ', data: {} })).toBe('obj');
    expect(getThreeDFormat({ name: 'fallback.txt', data: { filename: 'scene.glb' } })).toBe('glb');
    expect(getThreeDFormat({ name: 'mesh.stl', data: {} })).toBe('stl');
    expect(getThreeDFormat({ name: 'scene.gltf', data: {} })).toBe('gltf');
    expect(getThreeDFormat({ name: 'drawing.skp', data: {} })).toBeNull();
  });

  test('detects persistence for raw selector records and decorated records', () => {
    expect(isPersistedAttachment({ id: 'attachment-1' })).toBeTruthy();
    expect(isPersistedAttachment({ id: 'attachment-2', isPersisted: true })).toBeTruthy();
    expect(isPersistedAttachment({ id: 'local:attachment-3' })).toBeFalsy();
    expect(isPersistedAttachment({ id: 'attachment-4', isPersisted: false })).toBeFalsy();
  });

  test('allows cover only for persisted image files', () => {
    expect(
      isCoverableAttachment({
        isPersisted: true,
        type: 'file',
        data: { image: { width: 100, height: 100 } },
      }),
    ).toBeTruthy();
    expect(
      isCoverableAttachment({
        isPersisted: true,
        type: 'file',
        data: { image: { width: 100, height: 100 }, video: {} },
      }),
    ).toBeFalsy();
    expect(isCoverableAttachment({ isPersisted: true, type: 'link', data: {} })).toBeFalsy();
    expect(
      isCoverableAttachment({
        id: 'raw-image',
        type: 'file',
        data: { image: { width: 100, height: 100 } },
      }),
    ).toBeTruthy();
  });

  test('shows download only for persisted file attachments with a URL', () => {
    expect(
      isDownloadableAttachment({
        isPersisted: true,
        type: 'file',
        data: { url: '/attachments/report.pdf' },
      }),
    ).toBeTruthy();
    expect(
      isDownloadableAttachment({
        isPersisted: false,
        type: 'file',
        data: { url: '/attachments/report.pdf' },
      }),
    ).toBeFalsy();
    expect(
      isDownloadableAttachment({
        isPersisted: true,
        type: 'link',
        data: { url: 'https://example.com' },
      }),
    ).toBeFalsy();
    expect(
      isDownloadableAttachment({
        id: 'raw-file',
        type: 'file',
        data: { url: '/attachments/raw-report.pdf' },
      }),
    ).toBeTruthy();
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
