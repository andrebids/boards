import i18next from 'i18next';

import enUS from './en-US/chat';
import esES from './es-ES/chat';
import frFR from './fr-FR/chat';
import ptPT from './pt-PT/chat';

describe('chat notification translations', () => {
  test.each([
    [
      'pt-PT',
      ptPT.translation.chat,
      'Tem mensagens por ler numa conversa do chat.',
      'Tem mensagens por ler em 2 conversas do chat.',
    ],
    [
      'en-US',
      enUS.translation.chat,
      'You have unread messages in a chat conversation.',
      'You have unread messages in 2 chat conversations.',
    ],
    [
      'es-ES',
      esES.translation.chat,
      'Tienes mensajes sin leer en una conversación del chat.',
      'Tienes mensajes sin leer en 2 conversaciones del chat.',
    ],
    [
      'fr-FR',
      frFR.translation.chat,
      'Vous avez des messages non lus dans une conversation du chat.',
      'Vous avez des messages non lus dans 2 conversations du chat.',
    ],
  ])(
    'uses translated singular and plural copy for %s',
    async (language, chat, singular, plural) => {
      const i18n = i18next.createInstance();

      await i18n.init({
        lng: language,
        resources: {
          [language]: {
            translation: chat,
          },
        },
      });

      expect(i18n.t('unreadChatNotification', { count: 1 })).toBe(singular);
      expect(i18n.t('unreadChatNotification', { count: 2 })).toBe(plural);
    },
  );
});
