/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = async function isAuthenticated(req, res, proceed) {
  if (!req.currentUser) {
    const contentType = req.headers['content-type'];
    sails.log.warn('[AUTH][REJECTED]', {
      method: req.method,
      path: req.path,
      isMultipart: contentType && contentType.startsWith('multipart/'),
      hasAuthorization: Boolean(req.headers.authorization),
      hasAccessTokenCookie: Boolean(req.cookies && req.cookies.accessToken),
      hasHttpOnlyTokenCookie: Boolean(req.cookies && req.cookies.httpOnlyToken),
    });
    return res.unauthorized('Access token is missing, invalid or expired');
  }

  return proceed();
};
