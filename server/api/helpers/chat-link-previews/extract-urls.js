/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

module.exports = {
  sync: true,
  inputs: { text: { type: 'string', required: true } },

  fn(inputs) {
    const matches = inputs.text.match(URL_REGEX) || [];
    const urls = [];
    matches.forEach((match) => {
      const value = match.replace(/[),.;!?]+$/, '');
      try {
        const url = new URL(value);
        url.hash = '';
        if (!url.username && !url.password && ['http:', 'https:'].includes(url.protocol)) {
          const normalizedUrl = url.toString();
          if (!urls.some((item) => item.normalizedUrl === normalizedUrl)) {
            urls.push({ url: value, normalizedUrl, hostname: url.hostname.toLowerCase() });
          }
        }
      } catch (error) {
        // Invalid URLs remain plain text and do not create previews.
      }
    });
    return urls.slice(0, 1);
  },
};
