const fetch = require('node-fetch');

const CACHE_DURATION_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_ITEMS_PER_FEED = 12;
const NEWS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const FEEDS = {
  reddit: {
    source: 'r/singularity',
    url: 'https://www.reddit.com/r/singularity/.rss',
  },
  xda: {
    source: 'XDA Developers',
    url: 'https://www.xda-developers.com/feed/',
  },
};

const cache = {
  expiresAt: 0,
  inFlight: null,
  items: [],
};

const decodeXml = (value) =>
  value
    .trim()
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&#x([\da-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const extractTag = (entry, tagName) => {
  const match = entry.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match ? decodeXml(match[1]) : null;
};

const isSafeArticleUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (error) {
    return false;
  }
};

const getAtomEntryUrl = (entry) => {
  const links = [...entry.matchAll(/<link\s+([^>]*?)\/?>(?:<\/link>)?/gi)];
  const alternateLink = links.find(([, attributes]) => /\brel=["']alternate["']/i.test(attributes));
  const link = alternateLink || links[0];
  const hrefMatch = link && link[1].match(/\bhref=["']([^"']+)["']/i);
  const href = hrefMatch ? hrefMatch[1] : null;

  return href && isSafeArticleUrl(href) ? decodeXml(href) : null;
};

const getRssEntryUrl = (entry) => {
  const url = extractTag(entry, 'link');
  return url && isSafeArticleUrl(url) ? url : null;
};

const getTagAttributeUrl = (entry, tagName) => {
  const tagMatch = entry.match(new RegExp(`<${tagName}\\b([^>]*)>`, 'i'));
  const urlMatch = tagMatch && tagMatch[1].match(/\burl=["']([^"']+)["']/i);
  const url = urlMatch ? decodeXml(urlMatch[1]) : null;

  return url && isSafeArticleUrl(url) ? url : null;
};

const getAtomEntryImage = (entry) => getTagAttributeUrl(entry, 'media:thumbnail');

const getRssEntryImage = (entry) => getTagAttributeUrl(entry, 'enclosure');

const getEntryPublishedAt = (feedId, entry) => {
  const value =
    feedId === 'reddit'
      ? extractTag(entry, 'updated') || extractTag(entry, 'published')
      : extractTag(entry, 'pubDate');
  const timestamp = value && Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const filterRecentFeedItems = (items, now = Date.now()) =>
  items.filter(
    ({ publishedAt }) =>
      Number.isFinite(publishedAt) && publishedAt <= now && publishedAt >= now - NEWS_MAX_AGE_MS,
  );

const toPublicNewsItem = ({ publishedAt, ...item }) => item;

const interleaveFeedItems = (feedItems) => {
  const longestFeedLength = Math.max(0, ...feedItems.map((items) => items.length));
  const items = [];

  for (let itemIndex = 0; itemIndex < longestFeedLength; itemIndex += 1) {
    feedItems.forEach((feed) => {
      if (feed[itemIndex]) {
        items.push(feed[itemIndex]);
      }
    });
  }

  return items;
};

const parseFeedItems = (feedId, xml) => {
  const feed = FEEDS[feedId];
  if (!feed || typeof xml !== 'string') {
    return [];
  }

  const entryPattern =
    feedId === 'reddit'
      ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
      : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const getEntryUrl = feedId === 'reddit' ? getAtomEntryUrl : getRssEntryUrl;
  const getEntryImage = feedId === 'reddit' ? getAtomEntryImage : getRssEntryImage;

  return [...xml.matchAll(entryPattern)].slice(0, MAX_ITEMS_PER_FEED).flatMap(([, entry]) => {
    const title = extractTag(entry, 'title');
    const url = getEntryUrl(entry);
    const imageUrl = getEntryImage(entry);
    const publishedAt = getEntryPublishedAt(feedId, entry);

    return title && url
      ? [
          {
            ...(imageUrl && { imageUrl }),
            ...(publishedAt && { publishedAt }),
            source: feed.source,
            title,
            url,
          },
        ]
      : [];
  });
};

const fetchFeedItems = async (feedId) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(FEEDS[feedId].url, {
      headers: {
        Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Planka Dashboard TV RSS/1.0',
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`RSS source returned HTTP ${response.status}`);
    }

    return parseFeedItems(feedId, await response.text());
  } finally {
    clearTimeout(timeoutId);
  }
};

const refreshDashboardNews = async () => {
  const results = await Promise.allSettled(Object.keys(FEEDS).map(fetchFeedItems));
  const items = interleaveFeedItems(
    results.map((result) =>
      result.status === 'fulfilled' ? filterRecentFeedItems(result.value) : [],
    ),
  );

  if (items.length > 0) {
    cache.items = items;
    cache.expiresAt = Date.now() + CACHE_DURATION_MS;
  }

  return filterRecentFeedItems(cache.items).map(toPublicNewsItem);
};

const getDashboardNews = async () => {
  if (cache.items.length > 0 && cache.expiresAt > Date.now()) {
    return filterRecentFeedItems(cache.items).map(toPublicNewsItem);
  }

  if (!cache.inFlight) {
    cache.inFlight = refreshDashboardNews().finally(() => {
      cache.inFlight = null;
    });
  }

  return cache.inFlight;
};

module.exports = {
  filterRecentFeedItems,
  getDashboardNews,
  interleaveFeedItems,
  parseFeedItems,
};
