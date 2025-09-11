const Handlebars = require('handlebars');
const juice = require('juice');
const fs = require('fs');
const path = require('path');

const templateCache = new Map();

// ✅ MAPPING CORRETO: notification_type → partial_name
const NOTIFICATION_TYPE_TO_PARTIAL = {
  'moveCard': 'move-card',
  'commentCard': 'comment-card', 
  'addMemberToCard': 'add-member-to-card',
  'mentionInComment': 'mention-in-comment',
  'setDueDate': 'set-due-date' // Adicionar esta linha
};

module.exports = {
  inputs: {
    templateName: { type: 'string', required: true },
    data: { type: 'json', required: true },
  },

  async fn(inputs) {
    try {
      // ✅ Adicionar notification_partial_name aos dados
      const templateData = {
        ...inputs.data,
        notification_partial_name: NOTIFICATION_TYPE_TO_PARTIAL[inputs.templateName] || inputs.templateName
      };

      // ✅ SEMPRE compilar o master.hbs (não o template específico)
      if (!templateCache.has('master')) {
        const masterTemplatePath = path.join(sails.config.appPath, 'views', 'email-templates', 'master.hbs');
        
        if (!fs.existsSync(masterTemplatePath)) {
          throw new Error(`Template master não encontrado: ${masterTemplatePath}`);
        }
        
        const masterTemplate = fs.readFileSync(masterTemplatePath, 'utf8');
        templateCache.set('master', Handlebars.compile(masterTemplate));
        sails.log.info('✅ Template master compilado e em cache');
      }
      
      const compiledMasterTemplate = templateCache.get('master');
      const html = compiledMasterTemplate(templateData);
      
      // Inlinar CSS para compatibilidade com email
      const inlinedHtml = juice(html);
      
      sails.log.info(`✅ Template ${inputs.templateName} compilado com sucesso`);
      return inlinedHtml;
      
    } catch (error) {
      sails.log.error(`❌ Erro ao compilar template ${inputs.templateName}:`, error);
      throw error;
    }
  },
};
