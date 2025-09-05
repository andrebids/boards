/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function(sails) {
  return {
    initialize: function(cb) {
      sails.on('hook:orm:loaded', async function() {
        try {
          // Registar partials de email quando o ORM estiver carregado
          await sails.helpers.utils.registerEmailPartials();
          sails.log.info('✅ Hook de templates de email inicializado com sucesso');
          cb();
        } catch (error) {
          sails.log.error('❌ Erro ao inicializar hook de templates de email:', error);
          cb(error);
        }
      });
    }
  };
};
