const crypto = require('crypto');

const BEARER_TOKEN_PATTERN = /^Bearer (.+)$/;

const hasCodexUsageBridgeToken = (authorizationHeader, configuredToken) => {
  if (typeof authorizationHeader !== 'string' || typeof configuredToken !== 'string') {
    return false;
  }

  const match = authorizationHeader.match(BEARER_TOKEN_PATTERN);
  if (!match || configuredToken.length === 0) {
    return false;
  }

  const providedToken = Buffer.from(match[1]);
  const expectedToken = Buffer.from(configuredToken);

  return (
    providedToken.length === expectedToken.length &&
    crypto.timingSafeEqual(providedToken, expectedToken)
  );
};

module.exports = { hasCodexUsageBridgeToken };
