/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const path = require('path');

const Handlebars = require('handlebars');
const juice = require('juice');

const TRANSLATIONS = {
  'pt-PT': {
    subject: 'Repor palavra-passe do Blachere Boards',
    preheader: 'Utilize este link para escolher uma nova palavra-passe.',
    heading: 'Reposição de palavra-passe',
    introduction: 'Recebemos um pedido para alterar a palavra-passe da sua conta.',
    button: 'Escolher nova palavra-passe',
    expiry: 'Este link é válido durante 30 minutos e só pode ser utilizado uma vez.',
    security: 'Se não fez este pedido, ignore este email. A sua palavra-passe não será alterada.',
  },
  'en-GB': {
    subject: 'Reset your Blachere Boards password',
    preheader: 'Use this link to choose a new password.',
    heading: 'Password reset',
    introduction: 'We received a request to change the password for your account.',
    button: 'Choose a new password',
    expiry: 'This link is valid for 30 minutes and can only be used once.',
    security: 'If you did not request this, ignore this email. Your password will not change.',
  },
};

let compiledTemplate;

const getTemplate = () => {
  if (!compiledTemplate) {
    const templatePath = path.join(
      sails.config.appPath,
      'views',
      'email-templates',
      'password-reset.hbs',
    );
    compiledTemplate = Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
  }
  return compiledTemplate;
};

module.exports = {
  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
    token: {
      type: 'string',
      required: true,
    },
    messageId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const language = inputs.user.language === 'pt-PT' ? 'pt-PT' : 'en-GB';
    const copy = TRANSLATIONS[language];
    const resetUrl = new URL('/reset-password', sails.config.custom.baseUrl);
    resetUrl.searchParams.set('token', inputs.token);

    const html = juice(
      getTemplate()({
        language,
        subject: copy.subject,
        preheader: copy.preheader,
        heading: copy.heading,
        introduction: copy.introduction,
        button_label: copy.button,
        expiry_notice: copy.expiry,
        security_notice: copy.security,
        reset_url: resetUrl.toString(),
        logo_url: '{{logo_url}}',
      }),
    );

    const text = `${copy.heading}\n\n${copy.introduction}\n\n${copy.button}: ${resetUrl}\n\n${copy.expiry}\n${copy.security}`;

    return sails.helpers.utils.sendEmail.with({
      to: inputs.user.email,
      subject: copy.subject,
      html,
      text,
      messageId: inputs.messageId,
    });
  },
};
