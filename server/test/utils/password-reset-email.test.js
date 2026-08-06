const path = require('path');
const util = require('util');

const { expect } = require('chai');

const sendPasswordResetEmail = require('../../api/helpers/password-reset-requests/send-email');

const EMAIL_LANGUAGES = ['en-GB', 'en-US', 'es-ES', 'fr-FR', 'it-IT', 'pt-PT', 'ru-RU'];

const EXPECTED_SUBJECTS = {
  'en-GB': 'Reset your Blachere Boards password',
  'en-US': 'Reset your Blachere Boards password',
  'es-ES': 'Restablece tu contraseña de Blachere Boards',
  'fr-FR': 'Réinitialisez votre mot de passe Blachere Boards',
  'it-IT': 'Reimposta la password di Blachere Boards',
  'pt-PT': 'Repor a password do Blachere Boards',
  'ru-RU': 'Сброс пароля Blachere Boards',
};

describe('password-reset email', () => {
  let previousSails;
  let previousUser;
  const sentEmails = [];

  before(() => {
    previousSails = global.sails;
    previousUser = global.User;
    global.User = { EMAIL_LANGUAGES };
    global.sails = {
      config: {
        appPath: path.resolve(__dirname, '../..'),
        custom: {
          baseUrl: 'https://boards.example.test/app/',
          passwordResetTokenExpiresInMinutes: 17,
        },
      },
      helpers: {
        utils: {
          makeTranslator: (language) => {
            const translations = require(`../../config/locales/${language}.json`);
            return (key, ...values) => util.format(translations[key], ...values);
          },
          sendEmail: {
            with: async (email) => {
              sentEmails.push(email);
              return { messageId: email.messageId };
            },
          },
        },
      },
    };
  });

  beforeEach(() => {
    sentEmails.length = 0;
  });

  after(() => {
    if (previousSails === undefined) {
      delete global.sails;
    } else {
      global.sails = previousSails;
    }

    if (previousUser === undefined) {
      delete global.User;
    } else {
      global.User = previousUser;
    }
  });

  EMAIL_LANGUAGES.forEach((language) => {
    it(`renders and sends the ${language} translation`, async () => {
      await sendPasswordResetEmail.fn({
        user: {
          email: 'person@example.test',
          language,
        },
        token: 'secret-token',
        messageId: '<password-reset@example.test>',
      });

      expect(sentEmails).to.have.lengthOf(1);
      const [email] = sentEmails;
      expect(email.to).to.equal('person@example.test');
      expect(email.subject).to.equal(EXPECTED_SUBJECTS[language]);
      expect(email.messageId).to.equal('<password-reset@example.test>');
      expect(email.html).to.include(`<html lang="${language}">`);
      expect(email.html).to.include('17');
      expect(email.text).to.include('17');
      expect(email.html).to.include(
        'https://boards.example.test/app/reset-password?token=secret-token',
      );
      expect(email.text).to.include(
        'https://boards.example.test/app/reset-password?token=secret-token',
      );
      expect(email.html.match(/secret-token/g)).to.have.lengthOf(1);
      expect(email.text.match(/secret-token/g)).to.have.lengthOf(1);
      expect(email.suppressErrorDetails).to.equal(true);
    });
  });

  it('falls back to Portuguese for an unsupported account language', async () => {
    await sendPasswordResetEmail.fn({
      user: {
        email: 'person@example.test',
        language: 'de-DE',
      },
      token: 'secret-token',
      messageId: '<password-reset@example.test>',
    });

    expect(sentEmails).to.have.lengthOf(1);
    expect(sentEmails[0].subject).to.equal(EXPECTED_SUBJECTS['pt-PT']);
    expect(sentEmails[0].html).to.include('<html lang="pt-PT">');
  });
});
