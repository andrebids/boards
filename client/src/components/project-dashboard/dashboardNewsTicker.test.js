import {
  getDashboardTickerItems,
  shouldRenderDashboardTickerThumbnail,
} from './dashboard-news-ticker';

describe('dashboard news ticker performance boundaries', () => {
  it('caps the number of items rendered by the ticker', () => {
    const items = Array.from({ length: 20 }, (_, index) => ({
      url: `https://example.com/${index}`,
    }));

    expect(getDashboardTickerItems(items)).toHaveLength(18);
  });

  it('keeps thumbnails only for the lightweight Reddit feed', () => {
    expect(
      shouldRenderDashboardTickerThumbnail({
        source: 'r/singularity',
        imageUrl: 'https://preview.redd.it/example.jpg?width=640',
      }),
    ).toBe(true);
    expect(
      shouldRenderDashboardTickerThumbnail({
        source: 'XDA Developers',
        imageUrl: 'https://www.xda-developers.com/files/2026/08/image.jpg',
      }),
    ).toBe(false);
    expect(
      shouldRenderDashboardTickerThumbnail({ source: 'r/singularity' }),
    ).toBe(false);
  });
});
