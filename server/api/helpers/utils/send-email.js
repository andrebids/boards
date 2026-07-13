/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const path = require('path');
const fs = require('fs');

const generatePlainText = (data) => {
  return `${data.actor_name} ${data.action_verb} ${data.action_object}

Projeto: ${data.project_name}
Board: ${data.board_name}
Lista: ${data.list_name}

Cartão: ${data.card_title}
ID: ${data.card_id}

${data.card_url}

© ${data.current_year} Planka.`;
};

module.exports = {
  inputs: {
    to: {
      type: 'string',
      required: true,
    },
    subject: {
      type: 'string',
      required: true,
    },
    html: {
      type: 'string',
      required: true,
    },
    text: {
      type: 'string',
    },
    data: {
      type: 'json',
    }, // Compatibilidade com os emails de notificação existentes
  },

  async fn(inputs) {
    if (!sails.hooks.smtp.isEnabled()) {
      throw new Error('SMTP is not configured');
    }

    const transporter = sails.hooks.smtp.getTransporter();
    if (!transporter) {
      throw new Error('SMTP transporter is not available');
    }

    try {
      // Preparar anexos (logo inline)
      const attachments = [];
      const logoPath = path.join(sails.config.appPath, 'public', 'logo192.png');
      const logoCid = 'logo@planka';
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: logoCid,
        });
      }

      // Substituir placeholder do logo no HTML
      const htmlWithLogo = inputs.html.replace('{{logo_url}}', `cid:${logoCid}`);

      const mailOptions = {
        to: inputs.to,
        subject: inputs.subject,
        html: htmlWithLogo,
        text: inputs.text || (inputs.data ? generatePlainText(inputs.data) : undefined),
        attachments: attachments.length > 0 ? attachments : undefined,
        from: sails.config.custom.smtpFrom,
      };

      const info = await transporter.sendMail(mailOptions);
      sails.log.info(`✅ Email enviado com sucesso: ${info.messageId}`);

      return info;
    } catch (error) {
      sails.log.error(`❌ Erro ao enviar email: ${error.message}`);
      throw error;
    }
  },
};
