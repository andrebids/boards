const Handlebars = require('handlebars');
const juice = require('juice');
const fs = require('fs');
const path = require('path');

let cachedMasterTemplate;
let cachedTemplatesSignature;

// notification_type → partial_name
const NOTIFICATION_TYPE_TO_PARTIAL = {
  moveCard: 'move-card',
  commentCard: 'comment-card',
  addMemberToCard: 'add-member-to-card',
  addMemberToBoard: 'add-member-to-board',
  mentionInComment: 'mention-in-comment',
  setDueDate: 'set-due-date',
  createTask: 'create-task',
  completeTask: 'complete-task',
};

const COMPACT_NOTIFICATION_TYPES = new Set(['mentionInComment']);
const CHAT_NOTIFICATION_TYPE = 'chat-notification';

const getTemplatesSignature = (templatesDir) => {
  const getTemplateFiles = (directory) => {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getTemplateFiles(entryPath);
      }

      return entry.name.endsWith('.hbs') ? [entryPath] : [];
    });
  };

  return getTemplateFiles(templatesDir)
    .sort()
    .map((templatePath) => {
      const stats = fs.statSync(templatePath);
      return `${templatePath}:${stats.size}:${stats.mtimeMs}`;
    })
    .join('|');
};

module.exports = {
  inputs: {
    templateName: { type: 'string', required: true },
    data: { type: 'json', required: true },
  },

  async fn(inputs) {
    try {
      const templatesDir = path.join(sails.config.appPath, 'views', 'email-templates');
      const masterTemplatePath = path.join(templatesDir, 'master.hbs');

      if (!fs.existsSync(masterTemplatePath)) {
        throw new Error(`Template master não encontrado: ${masterTemplatePath}`);
      }

      const templatesSignature = getTemplatesSignature(templatesDir);

      if (!cachedMasterTemplate || cachedTemplatesSignature !== templatesSignature) {
        await sails.helpers.utils.registerEmailPartials();

        const masterTemplate = fs.readFileSync(masterTemplatePath, 'utf8');
        cachedMasterTemplate = Handlebars.compile(masterTemplate);
        cachedTemplatesSignature = templatesSignature;
        sails.log.info('Templates de email carregados ou atualizados');
      }

      const templateData = {
        ...inputs.data,
        is_chat_notification: inputs.templateName === CHAT_NOTIFICATION_TYPE,
        is_compact_notification: COMPACT_NOTIFICATION_TYPES.has(inputs.templateName),
        notification_partial_name:
          NOTIFICATION_TYPE_TO_PARTIAL[inputs.templateName] || inputs.templateName,
      };

      const html = cachedMasterTemplate(templateData);

      return juice(html);
    } catch (error) {
      sails.log.error(`Erro ao compilar template ${inputs.templateName}:`, error);
      throw error;
    }
  },
};
