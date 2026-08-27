import i18next from 'i18next';

import arYE from './ar-YE/core';
import bgBG from './bg-BG/core';
import csCZ from './cs-CZ/core';
import daDK from './da-DK/core';
import deDE from './de-DE/core';
import elGR from './el-GR/core';
import enGB from './en-GB/core';
import enUS from './en-US/core';
import esES from './es-ES/core';
import faIR from './fa-IR/core';
import fiFI from './fi-FI/core';
import frFR from './fr-FR/core';
import huHU from './hu-HU/core';
import idID from './id-ID/core';
import itIT from './it-IT/core';
import jaJP from './ja-JP/core';
import koKR from './ko-KR/core';
import nlNL from './nl-NL/core';
import plPL from './pl-PL/core';
import ptBR from './pt-BR/core';
import ptPT from './pt-PT/core';
import roRO from './ro-RO/core';
import ruRU from './ru-RU/core';
import skSK from './sk-SK/core';
import srCyrlRS from './sr-Cyrl-RS/core';
import srLatnRS from './sr-Latn-RS/core';
import svSE from './sv-SE/core';
import trTR from './tr-TR/core';
import ukUA from './uk-UA/core';
import uzUZ from './uz-UZ/core';
import zhCN from './zh-CN/core';
import zhTW from './zh-TW/core';

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

  test.each([
    [
      'de-DE',
      deDE.translation.common,
      'Chat-Benachrichtigungen aktivieren',
      'Aktivieren',
      'Jetzt nicht',
    ],
    ['en-US', enUS.translation.common, 'Turn on chat notifications', 'Turn on', 'Not now'],
    [
      'es-ES',
      esES.translation.common,
      'Activar las notificaciones del chat',
      'Activar',
      'Ahora no',
    ],
    [
      'fr-FR',
      frFR.translation.common,
      'Activer les notifications du chat',
      'Activer',
      'Pas maintenant',
    ],
    ['pt-BR', ptBR.translation.common, 'Ativar notificações do chat', 'Ativar', 'Agora não'],
    ['pt-PT', ptPT.translation.common, 'Ativar notificações do chat', 'Ativar', 'Agora não'],
  ])(
    'uses localized web push prompt copy for %s',
    async (language, common, title, activate, later) => {
      const i18n = i18next.createInstance();

      await i18n.init({
        lng: language,
        resources: {
          [language]: {
            translation: common,
          },
        },
      });

      expect(i18n.t('webPushPromptTitle')).toBe(title);
      expect(i18n.t('webPushPromptActivate')).toBe(activate);
      expect(i18n.t('webPushPromptLater')).toBe(later);
      expect(i18n.t('webPushPromptDescription')).not.toBe('webPushPromptDescription');
      expect(i18n.t('webPushPromptError')).not.toBe('webPushPromptError');
    },
  );

  test.each([
    ['ar-YE', arYE.translation.common],
    ['bg-BG', bgBG.translation.common],
    ['cs-CZ', csCZ.translation.common],
    ['da-DK', daDK.translation.common],
    ['de-DE', deDE.translation.common],
    ['el-GR', elGR.translation.common],
    ['en-GB', enGB.translation.common],
    ['en-US', enUS.translation.common],
    ['es-ES', esES.translation.common],
    ['fa-IR', faIR.translation.common],
    ['fi-FI', fiFI.translation.common],
    ['fr-FR', frFR.translation.common],
    ['hu-HU', huHU.translation.common],
    ['id-ID', idID.translation.common],
    ['it-IT', itIT.translation.common],
    ['ja-JP', jaJP.translation.common],
    ['ko-KR', koKR.translation.common],
    ['nl-NL', nlNL.translation.common],
    ['pl-PL', plPL.translation.common],
    ['pt-BR', ptBR.translation.common],
    ['pt-PT', ptPT.translation.common],
    ['ro-RO', roRO.translation.common],
    ['ru-RU', ruRU.translation.common],
    ['sk-SK', skSK.translation.common],
    ['sr-Cyrl-RS', srCyrlRS.translation.common],
    ['sr-Latn-RS', srLatnRS.translation.common],
    ['sv-SE', svSE.translation.common],
    ['tr-TR', trTR.translation.common],
    ['uk-UA', ukUA.translation.common],
    ['uz-UZ', uzUZ.translation.common],
    ['zh-CN', zhCN.translation.common],
    ['zh-TW', zhTW.translation.common],
  ])('defines all web push prompt copy for %s', (language, common) => {
    [
      'webPushPromptTitle',
      'webPushPromptDescription',
      'webPushPromptActivate',
      'webPushPromptLater',
      'webPushPromptError',
    ].forEach((key) => {
      expect(common[key]).toEqual(expect.any(String));
      expect(common[key]).not.toBe(key);
    });
  });
});
