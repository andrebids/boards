/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const path = require('path');

const Handlebars = require('handlebars');
const juice = require('juice');

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
    const language = User.EMAIL_LANGUAGES.includes(inputs.user.language)
      ? inputs.user.language
      : 'pt-PT';
    const t = sails.helpers.utils.makeTranslator(language);
    const translations = {
      subject: t('email:passwordReset:subject'),
      preheader: t('email:passwordReset:preheader'),
      heading: t('email:passwordReset:heading'),
      introduction: t('email:passwordReset:introduction'),
      button: t('email:passwordReset:button'),
      expiry: t(
        'email:passwordReset:expiry',
        sails.config.custom.passwordResetTokenExpiresInMinutes,
      ),
      security: t('email:passwordReset:security'),
    };
    const resetUrl = new URL(sails.config.custom.baseUrl);
    resetUrl.pathname = `${resetUrl.pathname.replace(/\/$/, '')}/reset-password`;
    resetUrl.search = '';
    resetUrl.hash = new URLSearchParams({ token: inputs.token }).toString();

    const html = juice(
      getTemplate()({
        language,
        subject: translations.subject,
        preheader: translations.preheader,
        heading: translations.heading,
        introduction: translations.introduction,
        button_label: translations.button,
        expiry_notice: translations.expiry,
        security_notice: translations.security,
        reset_url: resetUrl.toString(),
        logo_url: '{{logo_url}}',
      }),
    );

    const text = `${translations.heading}\n\n${translations.introduction}\n\n${translations.button}: ${resetUrl}\n\n${translations.expiry}\n${translations.security}`;

    return sails.helpers.utils.sendEmail.with({
      to: inputs.user.email,
      subject: translations.subject,
      html,
      text,
      messageId: inputs.messageId,
      suppressErrorDetails: true,
    });
  },
};
