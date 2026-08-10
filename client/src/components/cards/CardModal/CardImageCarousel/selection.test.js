import getDefaultMedia from './selection';

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
