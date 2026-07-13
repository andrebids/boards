/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * current-user hook
 *
 * @description :: A hook definition. Extends Sails by adding shadow routes, implicit actions,
 *                 and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

module.exports = function defineCurrentUserHook(sails) {
  const TOKEN_PATTERN = /^Bearer /;

  const getSessionAndUser = async (accessToken, httpOnlyToken) => {
    let payload;
    try {
      payload = sails.helpers.utils.verifyJwtToken(accessToken);
    } catch (error) {
      return null;
    }

    const session = await Session.qm.getOneUndeletedByAccessToken(accessToken);

    if (!session) {
      return null;
    }

    if (session.httpOnlyToken && httpOnlyToken !== session.httpOnlyToken) {
      return null;
    }

    const user = await User.qm.getOneById(payload.subject, {
      withDeactivated: false,
    });

    if (!user) {
      return null;
    }

    if (user.passwordChangedAt > payload.issuedAt) {
      return null;
    }

    return {
      session,
      user,
    };
  };

  return {
    /**
     * Runs when this Sails app loads/lifts.
     */

    async initialize() {
      sails.log.info('Initializing custom hook (`current-user`)');
    },

    routes: {
      before: {
        '/api/*': {
          async fn(req, res, next) {
            const { authorization: authorizationHeader } = req.headers;
            const { accessToken: cookieAccessToken, httpOnlyToken } = req.cookies;
            let sessionAndUser;

            if (authorizationHeader && TOKEN_PATTERN.test(authorizationHeader)) {
              const accessToken = authorizationHeader.replace(TOKEN_PATTERN, '');
              sessionAndUser = await getSessionAndUser(accessToken, httpOnlyToken);
            }

            // Direct browser requests (for example, opening a chat attachment)
            // cannot add an Authorization header. In that case, authenticate with
            // the access-token cookie and still validate the paired HTTP-only token.
            if (!sessionAndUser && cookieAccessToken) {
              sessionAndUser = await getSessionAndUser(cookieAccessToken, httpOnlyToken);
            }

            if (sessionAndUser) {
              const { session, user } = sessionAndUser;

              if (user.language) {
                req.setLocale(user.language);
              }

              Object.assign(req, {
                currentSession: session,
                currentUser: user,
              });

              if (req.isSocket) {
                sails.sockets.join(req, `@accessToken:${session.accessToken}`);
                sails.sockets.join(req, `@user:${user.id}`);
              }
            }

            return next();
          },
        },
        '/attachments/*': {
          async fn(req, res, next) {
            const { authorization: authorizationHeader } = req.headers;
            const { accessToken, httpOnlyToken } = req.cookies;

            // Try Authorization header first (for frontend requests)
            if (authorizationHeader && TOKEN_PATTERN.test(authorizationHeader)) {
              const accessTokenFromHeader = authorizationHeader.replace(TOKEN_PATTERN, '');
              const sessionAndUser = await getSessionAndUser(accessTokenFromHeader, httpOnlyToken);

              if (sessionAndUser) {
                const { session, user } = sessionAndUser;

                Object.assign(req, {
                  currentSession: session,
                  currentUser: user,
                });

                return next();
              }
            }

            // Fallback to cookies (for direct browser requests)
            if (accessToken) {
              const sessionAndUser = await getSessionAndUser(accessToken, httpOnlyToken);

              if (sessionAndUser) {
                const { session, user } = sessionAndUser;

                Object.assign(req, {
                  currentSession: session,
                  currentUser: user,
                });
              }
            }

            return next();
          },
        },
      },
    },
  };
};
