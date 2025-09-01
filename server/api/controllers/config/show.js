/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    try {
      const { currentUser } = this.req;

      let oidc = null;
      
      // Verificar se o hook OIDC existe e está habilitado
      if (sails.hooks.oidc && sails.hooks.oidc.isEnabled()) {
        try {
          const oidcClient = await sails.hooks.oidc.getClient();

          if (oidcClient) {
            const authorizationUrlParams = {
              scope: sails.config.custom.oidcScopes,
            };

            if (!sails.config.custom.oidcUseDefaultResponseMode) {
              authorizationUrlParams.response_mode = sails.config.custom.oidcResponseMode;
            }

            oidc = {
              authorizationUrl: oidcClient.authorizationUrl(authorizationUrlParams),
              endSessionUrl: oidcClient.issuer.end_session_endpoint ? oidcClient.endSessionUrl({}) : null,
              isEnforced: sails.config.custom.oidcEnforced,
            };
          }
        } catch (oidcError) {
          sails.log.warn('Config controller: OIDC error, continuing without OIDC:', oidcError.message);
        }
      }
      
      const result = {
        item: sails.helpers.config.presentOne(
          {
            oidc,
          },
          currentUser,
        ),
      };
      
      return result;
      
    } catch (error) {
      sails.log.error('Config controller: Error occurred:', error);
      throw error;
    }
  },
};
