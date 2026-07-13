/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 256 * 1024;
const MAX_REDIRECTS = 3;

const isPrivateIpv4 = (address) => {
  const parts = address.split('.').map(Number);
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224
  );
};

const isPrivateAddress = (address) => {
  if (net.isIPv4(address)) {
    return isPrivateIpv4(address);
  }
  if (!net.isIPv6(address)) {
    return true;
  }
  const normalized = address.toLowerCase();
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
};

const assertPublicUrl = async (value) => {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw 'blocked';
  }
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw 'blocked';
  }
  return url;
};

const decode = (value) =>
  String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

const findMeta = (html, names) => {
  const match = names
    .reduce(
      (patterns, name) => [
        ...patterns,
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
      ],
      [],
    )
    .map((pattern) => html.match(pattern))
    .find(Boolean);
  return match ? decode(match[1]) : null;
};

const readLimitedText = async (response) => {
  const reader = response.body && response.body.getReader();
  if (!reader) {
    return '';
  }
  const chunks = [];
  const readNext = async (total) => {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }
    const nextTotal = total + value.byteLength;
    if (nextTotal > MAX_BYTES) {
      await reader.cancel();
      return;
    }
    chunks.push(value);
    await readNext(nextTotal);
  };
  await readNext(0);
  return Buffer.concat(chunks).toString('utf8');
};

const requestMetadata = async (currentUrl, redirect = 0) => {
  const parsedUrl = await assertPublicUrl(currentUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  let response;
  try {
    response = await fetch(parsedUrl, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'PLANKA-LinkPreview/1.0' },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location || redirect === MAX_REDIRECTS) {
      throw new Error('Too many redirects');
    }
    return requestMetadata(new URL(location, parsedUrl).toString(), redirect + 1);
  }
  if (!response.ok || !String(response.headers.get('content-type')).includes('text/html')) {
    throw new Error('Preview response is not HTML');
  }

  const html = await readLimitedText(response);
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return {
    url: currentUrl,
    hostname: new URL(currentUrl).hostname.toLowerCase(),
    title: (
      findMeta(html, ['og:title', 'twitter:title']) || decode(titleMatch && titleMatch[1])
    ).slice(0, 200),
    description: (findMeta(html, ['og:description', 'description']) || '').slice(0, 500),
    siteName: (findMeta(html, ['og:site_name']) || '').slice(0, 100),
  };
};

module.exports = {
  inputs: { url: { type: 'string', required: true } },

  async fn(inputs) {
    return requestMetadata(inputs.url);
  },
};
