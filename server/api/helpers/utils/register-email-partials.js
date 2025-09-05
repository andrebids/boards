const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

module.exports = {
  inputs: {},

  async fn(inputs) {
    try {
      const partialsDir = path.join(sails.config.appPath, 'views', 'email-templates', 'partials');
      const typesDir = path.join(sails.config.appPath, 'views', 'email-templates', 'types');
      
      // ✅ Registar partials (header, footer, etc.)
      if (fs.existsSync(partialsDir)) {
        const partialFiles = fs.readdirSync(partialsDir).filter(file => file.endsWith('.hbs'));
        
        if (partialFiles.length === 0) {
          sails.log.warn('⚠️ Nenhum partial encontrado em:', partialsDir);
        } else {
          partialFiles.forEach(file => {
            const name = path.basename(file, '.hbs');
            const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
            Handlebars.registerPartial(name, content);
            sails.log.info(`✅ Partial registado: ${name}`);
          });
        }
      } else {
        sails.log.warn('⚠️ Diretório de partials não encontrado:', partialsDir);
      }
      
      // ✅ Registar tipos como partials (move-card, comment-card, etc.)
      if (fs.existsSync(typesDir)) {
        const typeFiles = fs.readdirSync(typesDir).filter(file => file.endsWith('.hbs'));
        
        if (typeFiles.length === 0) {
          sails.log.warn('⚠️ Nenhum template de tipo encontrado em:', typesDir);
        } else {
          typeFiles.forEach(file => {
            const name = path.basename(file, '.hbs');
            const content = fs.readFileSync(path.join(typesDir, file), 'utf8');
            Handlebars.registerPartial(name, content);
            sails.log.info(`✅ Partial de tipo registado: ${name}`);
          });
        }
      } else {
        sails.log.warn('⚠️ Diretório de tipos não encontrado:', typesDir);
      }
      
      sails.log.info('✅ Sistema de partials de email inicializado com sucesso');
      return true;
      
    } catch (error) {
      sails.log.error('❌ Erro ao registar partials de email:', error);
      throw error;
    }
  }
};
