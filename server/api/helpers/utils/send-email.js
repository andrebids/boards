/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const path = require('path');

const { prepareEmailLogo } = require('../../../utils/email-logo');

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
    messageId: {
      type: 'string',
    },
    data: {
      type: 'json',
    }, // Compatibilidade com os emails de notificação existentes
    suppressErrorDetails: {
      type: 'boolean',
      defaultsTo: false,
    },
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
      const logoPath = path.join(sails.config.appPath, 'public', 'logo192.png');
      const preparedEmail = prepareEmailLogo(inputs.html, logoPath);

      const mailOptions = {
        to: inputs.to,
        subject: inputs.subject,
        html: preparedEmail.html,
        text: inputs.text || (inputs.data ? generatePlainText(inputs.data) : undefined),
        attachments: preparedEmail.attachments,
        from: sails.config.custom.smtpFrom,
        messageId: inputs.messageId,
      };

      const info = await transporter.sendMail(mailOptions);
      sails.log.info(`✅ Email enviado com sucesso: ${info.messageId}`);

      return info;
    } catch (error) {
      if (inputs.suppressErrorDetails) {
        sails.log.error('Email delivery failed', {
          code: error.code,
          name: error.name,
        });
      } else {
        sails.log.error(`❌ Erro ao enviar email: ${error.message}`);
      }
      throw error;
    }
  },
};
