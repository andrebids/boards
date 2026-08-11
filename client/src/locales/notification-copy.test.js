import i18next from 'i18next';

import enUS from './en-US/core';
import ptPT from './pt-PT/core';

describe('project notification translations', () => {
  test.each([
    [
      'pt-PT',
      ptPT.translation.common,
      '1 notificação por ler neste projeto',
      '2 notificações por ler neste projeto',
    ],
    [
      'en-US',
      enUS.translation.common,
      '1 unread notification in this project',
      '2 unread notifications in this project',
    ],
  ])(
    'uses translated singular and plural copy for %s',
    async (language, common, singular, plural) => {
      const i18n = i18next.createInstance();

      await i18n.init({
        lng: language,
        resources: {
          [language]: {
            translation: common,
          },
        },
      });

      expect(i18n.t('unreadProjectNotifications', { count: 1 })).toBe(singular);
      expect(i18n.t('unreadProjectNotifications', { count: 2 })).toBe(plural);
    },
  );
});
