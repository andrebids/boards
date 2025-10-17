/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const nodemailer = require('nodemailer');
const path = require('path');

module.exports = {
  inputs: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    html: { type: 'string', required: true },
    data: { type: 'json' }, // Para gerar plain text
  },

  async fn(inputs) {
    // Verificar se notificações globais estão ativas
    if (!sails.config.custom.globalNotifications?.enabled) {
      sails.log.info('🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Sistema de notificações globais desativado, a saltar envio.');
      return;
    }

    sails.log.info('🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Iniciando sendGlobalNotification:', {
      to: inputs.to,
      subject: inputs.subject,
    });

    const config = sails.config.custom.globalNotifications.nodemailer;

    // Criar transporter Nodemailer com configurações otimizadas
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true para 465, false para outros ports
      auth: config.auth,
      // Configurações de performance e segurança
      pool: config.pool || true,
      maxConnections: config.maxConnections || 5,
      maxMessages: config.maxMessages || 100,
      rateDelta: config.rateDelta || 20000,
      rateLimit: config.rateLimit || 5,
      // TLS/SSL
      tls: {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'SSLv3',
      },
      // Debug (apenas em desenvolvimento)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    try {
      // Verificar conexão SMTP
      await transporter.verify();
      sails.log.info('✅ [GLOBAL_NOTIFICATIONS] Conexão SMTP verificada com sucesso');

      // Preparar anexos (logo inline)
      const attachments = [];
      const logoPath = path.join(sails.config.appPath, 'client', 'public', 'logo192.png');
      const logoCid = 'logo@planka';

      if (require('fs').existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: logoCid,
        });
      }

      // Substituir placeholder do logo no HTML
      const htmlWithLogo = inputs.html.replace('{{logo_url}}', `cid:${logoCid}`);

      // Gerar texto simples (fallback automático)
      const generatePlainText = (data) => {
        if (!data) return '';
        return `${data.actor_name} ${data.action_verb} ${data.action_object}

Projeto: ${data.project_name}
Board: ${data.board_name}
Lista: ${data.list_name}

Cartão: ${data.card_title}
ID: ${data.card_id}

${data.card_url}

© ${new Date().getFullYear()} Blachere Boards.`;
      };

      // Configurar mensagem com Nodemailer
      const mailOptions = {
        from: config.from,
        to: inputs.to,
        subject: inputs.subject,
        // HTML e texto automático
        html: htmlWithLogo,
        text: inputs.data ? generatePlainText(inputs.data) : undefined,
        // Anexos
        attachments: attachments.length > 0 ? attachments : undefined,
        // Headers adicionais
        headers: {
          'X-Mailer': 'Blachere Boards Global Notifications',
          'X-Priority': '3',
        },
        // Configurações de encoding
        encoding: 'utf8',
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);

      sails.log.info(`✅ [GLOBAL_NOTIFICATIONS] Notificação global enviada com Nodemailer:`);
      sails.log.info(`   - Message ID: ${info.messageId}`);
      sails.log.info(`   - Para: ${inputs.to}`);
      sails.log.info(`   - Assunto: ${inputs.subject}`);

      // Log da URL de preview (se usar Ethereal para testes)
      if (nodemailer.getTestMessageUrl(info)) {
        sails.log.info(`   - Preview: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      sails.log.error(`❌ [GLOBAL_NOTIFICATIONS] Erro ao enviar notificação global com Nodemailer:`);
      sails.log.error(`   - Para: ${inputs.to}`);
      sails.log.error(`   - Assunto: ${inputs.subject}`);
      sails.log.error(`   - Erro: ${error.message}`);

      // Log detalhado em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        sails.log.error(`   - Stack: ${error.stack}`);
      }

      throw error;
    } finally {
      // Fechar conexões do pool
      transporter.close();
    }
  },
};
