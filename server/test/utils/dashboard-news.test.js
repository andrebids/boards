const { expect } = require('chai');

const { parseFeedItems } = require('../../utils/dashboard-news');

describe('dashboard news feeds', () => {
  it('extracts Reddit Atom headlines and their article links', () => {
    const items = parseFeedItems(
      'reddit',
      `<?xml version="1.0"?><feed><entry><title>AI breakthrough &amp; implications</title><link href="https://reddit.com/r/singularity/comments/1" rel="alternate" /></entry></feed>`,
    );

    expect(items).to.deep.equal([
      {
        source: 'r/singularity',
        title: 'AI breakthrough & implications',
        url: 'https://reddit.com/r/singularity/comments/1',
      },
    ]);
  });

  it('extracts XDA RSS headlines and decodes CDATA titles', () => {
    const items = parseFeedItems(
      'xda',
      `<?xml version="1.0"?><rss><channel><item><title><![CDATA[The best Android phone]]></title><link>https://www.xda-developers.com/android-phone/</link></item></channel></rss>`,
    );

    expect(items).to.deep.equal([
      {
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
});
