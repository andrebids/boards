/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * query-methods hook
 *
 * @description :: A hook definition. Extends Sails by adding shadow routes, implicit actions,
 *                 and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const fs = require('fs');
const path = require('path');

module.exports = function defineQueryMethodsHook(sails) {
  const addQueryMethods = () => {
    // Verificar se os modelos estão disponíveis
    if (!sails.models || Object.keys(sails.models).length === 0) {
      sails.log.warn('⚠ No models available yet, retrying in 1 second...');
      setTimeout(addQueryMethods, 1000);
      return;
    }

    const queryMethodsByModelName = fs.readdirSync(path.join(__dirname, 'models')).reduce(
      (result, filename) => {
        const parsedName = path.parse(filename).name;
        const queryMethods = require(path.join(__dirname, 'models', filename));
        
        return {
          ...result,
          [parsedName]: queryMethods,
        };
      },
      {},
    );

    sails.log.info('✓ Models available, processing query methods...');
    sails.log.info('Available models:', Object.keys(sails.models));
    sails.log.info('Available query methods:', Object.keys(queryMethodsByModelName));
    sails.log.info('Looking for attachment model...');
    sails.log.info('Attachment model exists:', !!sails.models.attachment);
    sails.log.info('Attachment model identity:', sails.models.attachment ? sails.models.attachment.identity : 'undefined');

    _(sails.models).forEach((Model) => {
      sails.log.info(`Processing model: ${Model.globalId || Model.identity}, identity: ${Model.identity}, globalId: ${Model.globalId}`);
      
      // Primeiro, tentar match direto
      let queryMethods = queryMethodsByModelName[Model.identity];

      // Se não encontrar, tentar match case-insensitive
      if (!queryMethods) {
        const lowerCaseKeys = Object.keys(queryMethodsByModelName).map(key => key.toLowerCase());
        const lowerCaseIdentity = Model.identity.toLowerCase();
        
        if (lowerCaseKeys.includes(lowerCaseIdentity)) {
          const originalKey = Object.keys(queryMethodsByModelName).find(key => key.toLowerCase() === lowerCaseIdentity);
          queryMethods = queryMethodsByModelName[originalKey];
          sails.log.info(`✓ Found query methods for ${Model.identity} via case-insensitive match: ${originalKey}`);
        }
      }

      if (queryMethods) {
        Object.assign(Model, {
          qm: queryMethods,
        });
        sails.log.info(`✓ Added query methods to ${Model.identity}`);
      } else {
        sails.log.warn(`⚠ No query methods found for ${Model.identity}`);
        sails.log.warn(`Available keys: ${Object.keys(queryMethodsByModelName).join(', ')}`);
        sails.log.error(`❌ No query methods found for ${Model.identity} (case-insensitive search also failed)`);
      }
    });
    
    sails.log.info('✓ Query methods hook completed successfully');
    sails.log.info('Final check - Attachment.qm exists:', !!sails.models.attachment.qm);
    sails.log.info('Final check - Attachment.qm methods:', sails.models.attachment.qm ? Object.keys(sails.models.attachment.qm) : 'undefined');
    sails.log.info('Final check - sails.models.attachment exists:', !!sails.models.attachment);
    sails.log.info('Final check - sails.models.attachment.identity:', sails.models.attachment ? sails.models.attachment.identity : 'undefined');
    sails.log.info('Final check - sails.models keys:', Object.keys(sails.models));
    sails.log.info('Final check - sails.models.attachment.qm.createOne exists:', sails.models.attachment && sails.models.attachment.qm ? !!sails.models.attachment.qm.createOne : 'undefined');
    sails.log.info('Final check - sails.models.attachment.qm.createOne type:', sails.models.attachment && sails.models.attachment.qm && sails.models.attachment.qm.createOne ? typeof sails.models.attachment.qm.createOne : 'undefined');
  };

  return {
    /**
     * Runs when this Sails app loads/lifts.
     */
    initialize() {
      sails.log.info('Initializing custom hook (`query-methods`)');

      // Garantir que o ORM esteja carregado antes de adicionar query methods
      sails.after('hook:orm:loaded', () => {
        // Adicionar um pequeno delay para garantir que os modelos estejam disponíveis
        setTimeout(() => {
          addQueryMethods();
        }, 1000);
      });
    },
  };
};
