import getCardImageMedia from './presentationMediaItems';

describe('getCardImageMedia', () => {
  test('keeps only usable image attachments and retains their card and board origin', () => {
    const media = getCardImageMedia([
      {
        id: 'board-1',
        name: 'Campanha',
        cards: [
          {
            id: 'card-1',
            name: 'Cartaz',
            attachments: [
              {
                id: 'attachment-1',
                type: 'file',
                name: 'cartaz.png',
                data: {
                  image: {},
                  url: '/attachments/attachment-1/download/cartaz.png',
                  thumbnailUrls: { outside360: '/thumbnail.png' },
                },
              },
              {
                id: 'attachment-2',
                type: 'file',
                name: 'video.mp4',
                data: {
                  image: {},
                  video: {},
                  url: '/attachments/attachment-2/download/video.mp4',
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(media).toEqual([
      {
        id: 'attachment-1',
        name: 'cartaz.png',
        url: '/attachments/attachment-1/download/cartaz.png',
        thumbnailUrl: '/thumbnail.png',
        boardName: 'Campanha',
        cardName: 'Cartaz',
      },
    ]);
  });

  test('excludes links, videos and images that cannot be downloaded', () => {
    const media = getCardImageMedia([
      {
        id: 'board-1',
        name: 'Campanha',
        cards: [
          {
            id: 'card-1',
            name: 'Cartaz',
            attachments: [
              { id: 'link-1', type: 'link', name: 'Site', data: {} },
              {
                id: 'image-1',
                type: 'file',
                name: 'broken.png',
                data: { image: {} },
              },
            ],
          },
        ],
      },
    ]);

    expect(media).toEqual([]);
  });
});
