const { expect } = require('chai');

const {
  filterRecentFeedItems,
  interleaveFeedItems,
  parseFeedItems,
} = require('../../utils/dashboard-news');

describe('dashboard news feeds', () => {
  it('extracts Reddit Atom headlines and their article links', () => {
    const items = parseFeedItems(
      'reddit',
      `<?xml version="1.0"?><feed><entry><title>AI breakthrough &amp; implications</title><media:thumbnail url="https://preview.reddit.com/image.jpg" /><link href="https://reddit.com/r/singularity/comments/1" rel="alternate" /></entry></feed>`,
    );

    expect(items).to.deep.equal([
      {
        imageUrl: 'https://preview.reddit.com/image.jpg',
        source: 'r/singularity',
        title: 'AI breakthrough & implications',
        url: 'https://reddit.com/r/singularity/comments/1',
      },
    ]);
  });

  it('extracts XDA RSS headlines and decodes CDATA titles', () => {
    const items = parseFeedItems(
      'xda',
      `<?xml version="1.0"?><rss><channel><item><title><![CDATA[The best Android phone]]></title><link>https://www.xda-developers.com/android-phone/</link><enclosure url="https://static0.xdaimages.com/phone.jpg" type="image/jpeg" /></item></channel></rss>`,
    );

    expect(items).to.deep.equal([
      {
        imageUrl: 'https://static0.xdaimages.com/phone.jpg',
        source: 'XDA Developers',
        title: 'The best Android phone',
        url: 'https://www.xda-developers.com/android-phone/',
      },
    ]);
  });

  it('returns no headlines for a feed without valid title and link pairs', () => {
    expect(
      parseFeedItems(
        'xda',
        '<rss><channel><item><title>Missing link</title></item></channel></rss>',
      ),
    ).to.deep.equal([]);
  });

  it('alternates items from the available feeds', () => {
    expect(
      interleaveFeedItems([
        [{ title: 'Reddit 1' }, { title: 'Reddit 2' }, { title: 'Reddit 3' }],
        [{ title: 'XDA 1' }, { title: 'XDA 2' }],
      ]),
    ).to.deep.equal([
      { title: 'Reddit 1' },
      { title: 'XDA 1' },
      { title: 'Reddit 2' },
      { title: 'XDA 2' },
      { title: 'Reddit 3' },
    ]);
  });

  it('keeps only headlines published in the previous 24 hours', () => {
    const now = Date.parse('2026-08-21T12:00:00.000Z');

    expect(
      filterRecentFeedItems(
        [
          { publishedAt: now - 24 * 60 * 60 * 1000, title: 'At the boundary' },
          { publishedAt: now - 2 * 60 * 60 * 1000, title: 'Recent' },
          { publishedAt: now - 24 * 60 * 60 * 1000 - 1, title: 'Too old' },
          { publishedAt: now + 1, title: 'Future-dated' },
          { title: 'No date' },
        ],
        now,
      ),
    ).to.deep.equal([
      { publishedAt: now - 24 * 60 * 60 * 1000, title: 'At the boundary' },
      { publishedAt: now - 2 * 60 * 60 * 1000, title: 'Recent' },
    ]);
  });

  it('reads publication dates while parsing feeds', () => {
    expect(
      parseFeedItems(
        'reddit',
        '<feed><entry><title>Fresh headline</title><updated>2026-08-21T10:00:00Z</updated><link href="https://reddit.com/r/singularity/comments/1" /></entry></feed>',
      ),
    ).to.deep.equal([
      {
        publishedAt: Date.parse('2026-08-21T10:00:00Z'),
        source: 'r/singularity',
        title: 'Fresh headline',
        url: 'https://reddit.com/r/singularity/comments/1',
      },
    ]);
  });
});
