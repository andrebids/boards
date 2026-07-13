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
      'user-welcome.hbs',
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
    temporaryPassword: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const language = User.WELCOME_EMAIL_LANGUAGES.includes(inputs.user.language)
      ? inputs.user.language
      : 'pt-PT';

    const t = sails.helpers.utils.makeTranslator(language);
    const loginUrl = sails.config.custom.baseUrl;
    const translations = {
      subject: t('email:welcome:subject'),
      preheader: t('email:welcome:preheader'),
      greeting: t('email:welcome:greeting', inputs.user.name),
      introduction: t('email:welcome:introduction'),
      loginEmailLabel: t('email:welcome:loginEmail'),
      temporaryPasswordLabel: t('email:welcome:temporaryPassword'),
      openBoardsLabel: t('email:welcome:openBoards'),
      securityNotice: t('email:welcome:securityNotice'),
    };

    const html = juice(
      getTemplate()({
        language,
        subject: translations.subject,
        preheader: translations.preheader,
        greeting: translations.greeting,
        introduction: translations.introduction,
        login_email_label: translations.loginEmailLabel,
        temporary_password_label: translations.temporaryPasswordLabel,
        open_boards_label: translations.openBoardsLabel,
        security_notice: translations.securityNotice,
        email: inputs.user.email,
        temporary_password: inputs.temporaryPassword,
        login_url: loginUrl,
        logo_url: '{{logo_url}}',
      }),
    );

    const text = `${translations.greeting}

${translations.introduction}

${t('email:welcome:accessUrl')}: ${loginUrl}
${translations.loginEmailLabel}: ${inputs.user.email}
${translations.temporaryPasswordLabel}: ${inputs.temporaryPassword}

${translations.securityNotice}`;

    return sails.helpers.utils.sendEmail.with({
      to: inputs.user.email,
      subject: translations.subject,
      html,
      text,
    });
  },
};
