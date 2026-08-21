const CACHE_DURATION_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_ITEMS_PER_FEED = 12;

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

  return [...xml.matchAll(entryPattern)].slice(0, MAX_ITEMS_PER_FEED).flatMap(([, entry]) => {
    const title = extractTag(entry, 'title');
    const url = getEntryUrl(entry);

    return title && url ? [{ source: feed.source, title, url }] : [];
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
  const items = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  if (items.length > 0) {
    cache.items = items;
    cache.expiresAt = Date.now() + CACHE_DURATION_MS;
  }

  return cache.items;
};

const getDashboardNews = async () => {
  if (cache.items.length > 0 && cache.expiresAt > Date.now()) {
    return cache.items;
  }

  if (!cache.inFlight) {
    cache.inFlight = refreshDashboardNews().finally(() => {
      cache.inFlight = null;
    });
  }

  return cache.inFlight;
};

module.exports = { getDashboardNews, parseFeedItems };
