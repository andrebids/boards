import i18next from 'i18next';

import enUS from './en-US/core';
import ptPT from './pt-PT/core';

describe('project notification translations', () => {
  test.each([
    [
      'pt-PT',
      ptPT.translation.common,
      {
        earlierNotifications: 'Anteriores',
        markAllNotificationsAsRead: 'Marcar todas como lidas',
        notifications: 'Notificações',
        unknownCard: 'Cartão desconhecido',
        unknownLabel: 'Etiqueta desconhecida',
        unknownTask: 'Tarefa desconhecida',
        unknownTaskList: 'Lista de tarefas desconhecida',
      },
    ],
    [
      'en-US',
      enUS.translation.common,
      {
        earlierNotifications: 'Earlier',
        markAllNotificationsAsRead: 'Mark all as read',
        notifications: 'Notifications',
        unknownCard: 'Unknown card',
        unknownLabel: 'Unknown label',
        unknownTask: 'Unknown task',
        unknownTaskList: 'Unknown task list',
      },
    ],
  ])('uses translated panel copy for %s', async (language, common, expectedCopy) => {
    const i18n = i18next.createInstance();

    await i18n.init({
      lng: language,
      resources: {
        [language]: {
          translation: common,
        },
      },
    });

    Object.entries(expectedCopy).forEach(([key, value]) => {
      expect(i18n.t(key)).toBe(value);
    });
  });

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
