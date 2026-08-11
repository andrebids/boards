/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const escapeMarkdown = require('escape-markdown');
const escapeHtml = require('escape-html');

const { formatTextWithMentions } = require('../../../utils/mentions');

// Função para gerar iniciais do nome do utilizador
const generateInitials = (name) => {
  if (!name || typeof name !== 'string') {
    return 'U';
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 0) {
    return 'U';
  }

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  // Primeira letra do primeiro nome + primeira letra do último nome
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Função para gerar URLs dinâmicas
const generateUrl = (path = '') => {
  const baseUrl = sails.config.custom && sails.config.custom.baseUrl;

  if (!baseUrl) {
    sails.log.warn('⚠️ BASE_URL não configurada, usando localhost como fallback');
    return `http://localhost:3008${path}`;
  }

  // Remove barra final do baseUrl se existir
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  // Adiciona barra inicial ao path se não existir
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBaseUrl}${cleanPath}`;
};

const buildTitle = (notification, t) => {
  let baseTitle;
  switch (notification.type) {
    case Notification.Types.MOVE_CARD:
      baseTitle = t('Card Moved');
      break;
    case Notification.Types.COMMENT_CARD:
      baseTitle = t('New Comment');
      break;
    case Notification.Types.ADD_MEMBER_TO_BOARD:
      baseTitle = t('You Were Added to Board');
      break;
    case Notification.Types.ADD_MEMBER_TO_CARD:
      baseTitle = t('You Were Added to Card');
      break;
    case Notification.Types.MENTION_IN_COMMENT:
      baseTitle = t('You Were Mentioned in Comment');
      break;
    case 'setDueDate':
      baseTitle = t('Due Date Updated');
      break;
    case 'createTask':
      baseTitle = t('Task Created');
      break;
    case 'completeTask':
      baseTitle = t('Task Completed');
      break;
    default:
      return null;
  }
  return `Blachere Boards: ${baseTitle}`;
};

const buildBodyByFormat = (board, card, notification, actorUser, t) => {
  const markdownCardLink =
    card && `[${escapeMarkdown(card.name)}](${generateUrl(`cards/${card.id}`)})`;
  const htmlCardLink =
    card && `<a href="${generateUrl(`cards/${card.id}`)}">${escapeHtml(card.name)}</a>`;
  const markdownBoardLink = `[${escapeMarkdown(board.name)}](${generateUrl(`boards/${board.id}`)})`;
  const htmlBoardLink = `<a href="${generateUrl(`boards/${board.id}`)}">${escapeHtml(
    board.name,
  )}</a>`;

  switch (notification.type) {
    case Notification.Types.MOVE_CARD: {
      const fromListName = sails.helpers.lists.makeName(notification.data.fromList);
      const toListName = sails.helpers.lists.makeName(notification.data.toList);

      return {
        text: t(
          '%s moved %s from %s to %s on %s',
          actorUser.name,
          card.name,
          fromListName,
          toListName,
          board.name,
        ),
        markdown: t(
          '%s moved %s from %s to %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          `**${escapeMarkdown(fromListName)}**`,
          `**${escapeMarkdown(toListName)}**`,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s moved %s from %s to %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          `<b>${escapeHtml(fromListName)}</b>`,
          `<b>${escapeHtml(toListName)}</b>`,
          escapeHtml(board.name),
        ),
      };
    }
    case Notification.Types.COMMENT_CARD: {
      const commentText = _.truncate(formatTextWithMentions(notification.data.text));

      return {
        text: `${t(
          '%s left a new comment to %s on %s',
          actorUser.name,
          card.name,
          board.name,
        )}:\n${commentText}`,
        markdown: `${t(
          '%s left a new comment to %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          escapeMarkdown(board.name),
        )}:\n\n*${escapeMarkdown(commentText)}*`,
        html: `${t(
          '%s left a new comment to %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          escapeHtml(board.name),
        )}:\n\n<i>${escapeHtml(commentText)}</i>`,
      };
    }
    case Notification.Types.ADD_MEMBER_TO_BOARD:
      return {
        text: t('%s added you to board %s', actorUser.name, board.name),
        markdown: t('%s added you to board %s', escapeMarkdown(actorUser.name), markdownBoardLink),
        html: t('%s added you to board %s', escapeHtml(actorUser.name), htmlBoardLink),
      };
    case Notification.Types.ADD_MEMBER_TO_CARD:
      return {
        text: t('%s added you to %s on %s', actorUser.name, card.name, board.name),
        markdown: t(
          '%s added you to %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          escapeMarkdown(board.name),
        ),
        html: t(
          '%s added you to %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          escapeHtml(board.name),
        ),
      };
    case Notification.Types.MENTION_IN_COMMENT: {
      const commentText = _.truncate(formatTextWithMentions(notification.data.text));

      return {
        text: `${t(
          '%s mentioned you in %s on %s',
          actorUser.name,
          card.name,
          board.name,
        )}:\n${commentText}`,
        markdown: `${t(
          '%s mentioned you in %s on %s',
          escapeMarkdown(actorUser.name),
          markdownCardLink,
          escapeMarkdown(board.name),
        )}:\n\n*${escapeMarkdown(commentText)}*`,
        html: `${t(
          '%s mentioned you in %s on %s',
          escapeHtml(actorUser.name),
          htmlCardLink,
          escapeHtml(board.name),
        )}:\n\n<i>${escapeHtml(commentText)}</i>`,
      };
    }
    default:
      return null;
  }
};

// ✅ Sistema de templates com fallback
const EMAIL_TEMPLATES_ENABLED = process.env.EMAIL_TEMPLATES_ENABLED === 'true';
const isEmailNotificationService = ({ url }) => /^mailtos?:\/\//i.test(url.trim());

const buildAndSendNotifications = async (
  services,
  board,
  card,
  notification,
  actorUser,
  t,
  inputs,
) => {
  // ✅ Se templates estão ativos, usar HTML dos templates para serviços HTML
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      const { notifiableUser } = inputs;

      // Verificar se algum serviço usa formato HTML
      const hasHtmlService = services.some((service) => service.format === 'html');

      if (hasHtmlService) {
        // Gerar HTML dos templates apenas se houver serviços HTML
        // eslint-disable-next-line no-use-before-define
        const templateHtml = await buildAndSendEmailWithTemplates(
          board,
          card,
          notification,
          actorUser,
          notifiableUser,
          t,
          inputs,
        );

        // Criar body com HTML dos templates
        const bodyByFormat = buildBodyByFormat(board, card, notification, actorUser, t);
        const bodyWithTemplates = {
          ...bodyByFormat,
          html: templateHtml, // Substituir HTML padrão pelos templates
        };

        await sails.helpers.utils.sendNotifications(
          services,
          buildTitle(notification, t),
          bodyWithTemplates,
        );
      } else {
        // Nenhum serviço HTML, usar formato padrão
        await sails.helpers.utils.sendNotifications(
          services,
          buildTitle(notification, t),
          buildBodyByFormat(board, card, notification, actorUser, t),
        );
      }
    } catch (error) {
      sails.log.error('❌ Erro nos templates para Apprise, usando formato padrão:', error);
      // Fallback para formato original
      await sails.helpers.utils.sendNotifications(
        services,
        buildTitle(notification, t),
        buildBodyByFormat(board, card, notification, actorUser, t),
      );
    }
  } else {
    // Usar formato original se templates não estão ativos
    await sails.helpers.utils.sendNotifications(
      services,
      buildTitle(notification, t),
      buildBodyByFormat(board, card, notification, actorUser, t),
    );
  }
};

// eslint-disable-next-line no-unused-vars
const buildAndSendEmail = async (
  board,
  card,
  notification,
  actorUser,
  notifiableUser,
  t,
  inputs,
) => {
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      // eslint-disable-next-line no-use-before-define
      await buildAndSendEmailWithTemplates(
        board,
        card,
        notification,
        actorUser,
        notifiableUser,
        t,
        inputs,
      );
    } catch (error) {
      sails.log.error('❌ Erro nos templates, usando fallback para HTML inline:', error);
      // eslint-disable-next-line no-use-before-define
      await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
    }
  } else {
    // eslint-disable-next-line no-use-before-define
    await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
  }
};

const buildAndSendEmailWithTemplates = async (
  board,
  card,
  notification,
  actorUser,
  notifiableUser,
  t,
  inputs,
) => {
  const project = inputs.project || board.project;
  const currentList = inputs.list || (card && card.list);
  const listName = currentList ? sails.helpers.lists.makeName(currentList) : '';
  const isBoardNotification = notification.type === Notification.Types.ADD_MEMBER_TO_BOARD;
  const currentYear = new Date().getFullYear();
  const emailLanguage = (notifiableUser && notifiableUser.language) || 'pt-PT';
  const hasDueDate = Boolean(card && card.dueDate);
  const rawComment = (notification && notification.data && notification.data.text) || '';
  const commentExcerpt =
    rawComment.length > 220 ? `${rawComment.substring(0, 217).trimEnd()}...` : rawComment;
  // eslint-disable-next-line no-use-before-define
  const localizedData = getNotificationSpecificData(
    notification,
    actorUser,
    t,
    card,
    currentList,
    board,
    project,
  );
  const stripTrailingColon = (value) => value.replace(/\s*:\s*$/, '');

  // Dados específicos por tipo de notificação
  const getNotificationPresentation = () => {
    switch (notification && notification.type) {
      case Notification.Types.MOVE_CARD: {
        const fromListName =
          notification && notification.data && notification.data.fromList
            ? sails.helpers.lists.makeName(notification.data.fromList)
            : 'Lista Origem';
        const toListName =
          notification && notification.data && notification.data.toList
            ? sails.helpers.lists.makeName(notification.data.toList)
            : 'Lista Destino';
        return {
          from_list: fromListName,
          to_list: toListName,
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:moved')),
        };
      }
      case Notification.Types.COMMENT_CARD:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:comment')),
        };
      case Notification.Types.ADD_MEMBER_TO_BOARD:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:addedToBoard')),
        };
      case Notification.Types.ADD_MEMBER_TO_CARD:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:addedMember')),
        };
      case Notification.Types.MENTION_IN_COMMENT:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:mentioned')),
        };
      case Notification.Types.SET_DUE_DATE:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:dueDateChanged')),
        };
      case Notification.Types.CREATE_TASK:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:newTask')),
        };
      case Notification.Types.COMPLETE_TASK:
        return {
          action_verb: t(`notification:${notification.type}.verb`),
          action_object: t(`notification:${notification.type}.object`),
          notification_type_label: stripTrailingColon(t('email:label:taskCompleted')),
        };
      default:
        return {};
    }
  };

  const templateData = {
    ...localizedData,
    actor_name: (actorUser && actorUser.name) || 'Utilizador',
    actor_initials: generateInitials((actorUser && actorUser.name) || 'Utilizador'),
    user_name: (notifiableUser && notifiableUser.name) || 'Utilizador',
    card_title: (card && card.name) || (board && board.name) || 'Board',
    card_id: (card && card.id) || '',
    project_name: (project && project.name) || (board && board.name) || 'Projeto',
    board_name: (board && board.name) || 'Quadro',
    list_name: listName,
    card_url:
      localizedData.card_url ||
      (isBoardNotification
        ? generateUrl(`boards/${board.id}`)
        : generateUrl(`cards/${(card && card.id) || ''}`)),
    planka_base_url: generateUrl(),
    notification_title: buildTitle(notification, t),
    email_language: emailLanguage,
    email_greeting: t(
      'email:welcome:greeting',
      (notifiableUser && notifiableUser.name) || 'Utilizador',
    ),
    send_date: new Date().toLocaleDateString(emailLanguage),
    user_email: (notifiableUser && notifiableUser.email) || 'utilizador@exemplo.com',
    current_year: currentYear,
    email_copyright: t('email:copyright').replace('{{current_year}}', currentYear),
    email_action_commented: t('email:action:commented'),
    email_action_mentioned: t('email:action:mentioned'),
    notification_type: (notification && notification.type) || '',
    is_board_notification: isBoardNotification,
    show_due_date_in_header: !notification || notification.type !== Notification.Types.SET_DUE_DATE,
    has_due_date: hasDueDate,

    comment_excerpt: commentExcerpt || stripTrailingColon(t('email:label:comment')),
    due_date: hasDueDate ? new Date(card.dueDate).toLocaleDateString(emailLanguage) : '',

    // Dados específicos do tipo
    ...getNotificationPresentation(),
  };

  const html = await sails.helpers.utils.compileEmailTemplate.with({
    templateName: (notification && notification.type) || 'comment-card',
    data: templateData,
  });

  // Retornar HTML para uso no Apprise
  return html;
};

// ✅ Fallback para HTML inline (método antigo)
const buildAndSendEmailLegacy = async (board, card, notification, actorUser, notifiableUser, t) => {
  const cardLink =
    card && `<a href="${generateUrl(`cards/${card.id}`)}">${escapeHtml(card.name)}</a>`;
  const boardLink = `<a href="${generateUrl(`boards/${board.id}`)}">${escapeHtml(board.name)}</a>`;

  let html;
  switch (notification.type) {
    case Notification.Types.MOVE_CARD: {
      const fromListName = sails.helpers.lists.makeName(notification.data.fromList);
      const toListName = sails.helpers.lists.makeName(notification.data.toList);

      html = `<p>${t(
        '%s moved %s from %s to %s on %s',
        escapeHtml(actorUser.name),
        cardLink,
        escapeHtml(fromListName),
        escapeHtml(toListName),
        boardLink,
      )}</p>`;

      break;
    }
    case Notification.Types.COMMENT_CARD:
      html = `<p>${t(
        '%s left a new comment to %s on %s',
        escapeHtml(actorUser.name),
        cardLink,
        boardLink,
      )}</p><p>${escapeHtml(notification.data.text)}</p>`;

      break;
    case Notification.Types.ADD_MEMBER_TO_BOARD:
      html = `<p>${t('%s added you to board %s', escapeHtml(actorUser.name), boardLink)}</p>`;

      break;
    case Notification.Types.ADD_MEMBER_TO_CARD:
      html = `<p>${t(
        '%s added you to %s on %s',
        escapeHtml(actorUser.name),
        cardLink,
        boardLink,
      )}</p>`;

      break;
    case Notification.Types.MENTION_IN_COMMENT:
      html = `<p>${t(
        '%s mentioned you in %s on %s',
        escapeHtml(actorUser.name),
        cardLink,
        boardLink,
      )}</p><p>${escapeHtml(notification.data.text)}</p>`;

      break;
    default:
      return;
  }

  await sails.helpers.utils.sendEmail.with({
    html,
    to: notifiableUser.email,
    subject: buildTitle(notification, t),
  });
};

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    if (values.user) {
      values.userId = values.user.id;
    }

    const notifiableUser = values.user || (await User.qm.getOneById(values.userId));
    if (!notifiableUser) {
      sails.log.warn(
        'Notificação %s ignorada porque o utilizador %s não existe',
        values.type,
        values.userId,
      );
      return null;
    }

    const hasNotificationsDisabled =
      notifiableUser.notificationLevel === User.NotificationLevels.NONE;
    const hasNonEssentialNotificationDisabled =
      notifiableUser.notificationLevel === User.NotificationLevels.ESSENTIAL &&
      !Notification.ESSENTIAL_TYPES.includes(values.type);

    if (hasNotificationsDisabled || hasNonEssentialNotificationDisabled) {
      sails.log.debug(
        'Notificação pessoal suprimida (userId=%s, type=%s, notificationLevel=%s)',
        notifiableUser.id,
        values.type,
        notifiableUser.notificationLevel,
      );
      return null;
    }

    const isCommentRelated =
      values.type === Notification.Types.COMMENT_CARD ||
      values.type === Notification.Types.MENTION_IN_COMMENT;

    const notificationData = {
      ...values.data,
      ...(values.card && {
        card: {
          id: values.card.id,
          name: values.card.name,
          boardId: values.card.boardId,
        },
      }),
    };

    const notification = await Notification.qm.createOne({
      type: values.type,
      data: notificationData,
      userId: notifiableUser.id,
      creatorUserId: values.creatorUser.id,
      boardId: inputs.board.id,
      cardId: values.card && values.card.id,
      commentId: isCommentRelated && values.comment ? values.comment.id : undefined,
      actionId: values.action && values.action.id,
    });

    sails.sockets.broadcast(`user:${notification.userId}`, 'notificationCreate', {
      item: notification,
      included: {
        users: [sails.helpers.users.presentOne(values.creatorUser, {})], // FIXME: hack
      },
    });

    sails.helpers.utils.sendWebhooks.with({
      event: 'notificationCreate',
      buildData: () => ({
        item: notification,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          ...(inputs.list && {
            lists: [inputs.list],
          }),
          ...(values.card && {
            cards: [values.card],
          }),
          ...(isCommentRelated
            ? {
                comments: [values.comment],
              }
            : values.action && {
                actions: [values.action],
              }),
        },
      }),
      user: values.creatorUser,
    });

    sails.log.info(`🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Notificação criada:`, {
      notificationId: notification.id,
      type: notification.type,
      userId: notification.userId,
      cardId: (values.card && values.card.id) || null,
    });

    // --- LÓGICA DE ENVIO DE NOTIFICAÇÕES ---

    // Define quais os tipos de notificação que devem acionar um e-mail
    const EMAIL_NOTIFIABLE_TYPES = [
      Notification.Types.SET_DUE_DATE,
      Notification.Types.ADD_MEMBER_TO_BOARD,
      Notification.Types.ADD_MEMBER_TO_CARD,
      Notification.Types.COMMENT_CARD,
      Notification.Types.MENTION_IN_COMMENT,
    ];

    const globalNotificationsEnabled =
      sails.config.custom.globalNotifications && sails.config.custom.globalNotifications.enabled;
    const notificationServices = await NotificationService.qm.getByUserId(notification.userId);
    const smtpIsEnabled = sails.hooks.smtp.isEnabled();
    const centralEmailIsEnabled = globalNotificationsEnabled || smtpIsEnabled;
    const externalNotificationServices = centralEmailIsEnabled
      ? notificationServices.filter(
          (notificationService) => !isEmailNotificationService(notificationService),
        )
      : notificationServices;

    if (externalNotificationServices.length < notificationServices.length) {
      sails.log.info(
        'Serviço pessoal de email ignorado porque o envio SMTP central já está ativo (userId=%s)',
        notification.userId,
      );
    }

    sails.log.info(`🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Status dos mecanismos de envio:`, {
      notificationType: notification.type,
      isInEmailNotifiableTypes: EMAIL_NOTIFIABLE_TYPES.includes(notification.type),
      globalNotificationsEnabled,
      notificationServicesCount: notificationServices.length,
      smtpIsEnabled,
    });

    // Verificar se algum mecanismo de envio de e-mail está ativo
    if (globalNotificationsEnabled || notificationServices.length > 0 || smtpIsEnabled) {
      // E verificar também se o tipo de notificação é um dos permitidos para e-mail
      if (EMAIL_NOTIFIABLE_TYPES.includes(notification.type)) {
        sails.log.info(`🔍 [DIAGNÓSTICO_EMAIL_NOTIF] User notificável encontrado:`, {
          userId: notifiableUser.id,
          userEmail: notifiableUser.email,
          userName: notifiableUser.name,
        });

        const t = sails.helpers.utils.makeTranslator(notifiableUser.language);
        const emailHtml = await buildAndSendEmailWithTemplates(
          inputs.board,
          values.card,
          notification,
          values.creatorUser,
          notifiableUser,
          t,
          inputs,
        );
        // eslint-disable-next-line no-use-before-define
        const emailData = getNotificationSpecificData(
          notification,
          values.creatorUser,
          t,
          values.card,
          inputs.list,
          inputs.board,
          inputs.project,
        );

        // PRIORIDADE 1: Notificações Globais
        if (globalNotificationsEnabled) {
          sails.log.info(
            `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Tentando envio via Nodemailer para "${notifiableUser.email}"...`,
          );
          try {
            await sails.helpers.utils.sendGlobalNotification.with({
              to: notifiableUser.email,
              subject: buildTitle(notification, t),
              html: emailHtml,
              data: emailData,
            });
            sails.log.info(
              `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] ✅ Email enviado com sucesso para "${notifiableUser.email}"`,
            );
          } catch (error) {
            sails.log.error(`🔍 [DIAGNÓSTICO_EMAIL_NOTIF] ❌ Falha no envio do email:`, {
              to: notifiableUser.email,
              error: error.message,
              stack: error.stack,
            });
          }
        } else if (smtpIsEnabled) {
          sails.log.info(
            `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Notificações globais desativadas, tentando envio via SMTP padrão para "${notifiableUser.email}"...`,
          );
          try {
            await sails.helpers.utils.sendEmail.with({
              to: notifiableUser.email,
              subject: buildTitle(notification, t),
              html: emailHtml,
              data: emailData,
            });
            sails.log.info(
              `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] ✅ Email enviado com sucesso via SMTP padrão para "${notifiableUser.email}"`,
            );
          } catch (error) {
            sails.log.error(
              `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] ❌ Falha no envio do email via SMTP padrão:`,
              {
                to: notifiableUser.email,
                error: error.message,
                stack: error.stack,
              },
            );
          }
        } else {
          sails.log.info(
            `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Notificações globais e SMTP padrão desativados, não enviando email`,
          );
        }

        if (externalNotificationServices.length > 0) {
          const services = externalNotificationServices.map((notificationService) =>
            _.pick(notificationService, ['url', 'format']),
          );

          try {
            await buildAndSendNotifications(
              services,
              inputs.board,
              values.card,
              notification,
              values.creatorUser,
              t,
              {
                ...inputs,
                notifiableUser,
              },
            );
          } catch (error) {
            sails.log.error('Falha no envio da notificação pessoal por Apprise:', error);
          }
        }
      } else {
        sails.log.info(
          `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Tipo "${notification.type}" não está na lista EMAIL_NOTIFIABLE_TYPES, não enviando email`,
        );
      }
    } else {
      sails.log.info(
        `🔍 [DIAGNÓSTICO_EMAIL_NOTIF] Nenhum mecanismo de envio está ativo, não enviando email`,
      );
    }

    return notification;
  },
};

const getNotificationSpecificData = (notification, creatorUser, t, card, list, board, project) => {
  const isBoardNotification = notification.type === Notification.Types.ADD_MEMBER_TO_BOARD;
  const boardForNotification = board || (card && card.board);
  const resourceUrl = isBoardNotification
    ? generateUrl(
        `boards/${(boardForNotification && boardForNotification.id) || notification.boardId}`,
      )
    : generateUrl(`cards/${(card && card.id) || notification.cardId}`);

  // Medida de segurança para evitar crashes se os dados estiverem incompletos
  if (!boardForNotification || !project) {
    sails.log.warn(
      'Dados do quadro ou do projeto em falta para a notificação (type=%s, cardId=%s)',
      notification.type,
      (card && card.id) || null,
    );
    return {
      actor_name: creatorUser.name,
      action_verb: t(`notification:${notification.type}.verb`),
      action_object: t(`notification:${notification.type}.object`),
      project_name: 'Projeto desconhecido',
      board_name: 'Quadro desconhecido',
      list_name: (list && list.name) || (card && card.list && card.list.name) || '',
      card_title:
        (card && card.name) ||
        (notification.data && notification.data.board && notification.data.board.name) ||
        'Board',
      card_id: (card && card.id) || '',
      card_url: resourceUrl,
    };
  }

  // Gerar URL específica baseada no tipo de notificação
  let specificUrl = resourceUrl;

  if (
    notification.type === Notification.Types.COMMENT_CARD ||
    notification.type === Notification.Types.MENTION_IN_COMMENT
  ) {
    // Para comentários, tentar levar diretamente ao comentário específico
    if (notification.data && notification.data.commentId) {
      specificUrl = generateUrl(`cards/${card.id}#comment-${notification.data.commentId}`);
    }
  } else if (notification.type === 'createTask' || notification.type === 'completeTask') {
    // Para tarefas, tentar levar à tarefa específica se disponível
    if (notification.data && notification.data.taskId) {
      specificUrl = generateUrl(`cards/${card.id}#task-${notification.data.taskId}`);
    }
  }

  // Gerar texto específico do botão CTA baseado no tipo de notificação
  let ctaButtonText = isBoardNotification ? t('email:viewBoard') : t('email:viewCard');

  if (
    notification.type === Notification.Types.COMMENT_CARD ||
    notification.type === Notification.Types.MENTION_IN_COMMENT
  ) {
    ctaButtonText = t('email:viewComment');
  } else if (notification.type === 'createTask' || notification.type === 'completeTask') {
    ctaButtonText = t('email:viewTask');
  }

  return {
    actor_name: creatorUser.name,
    action_verb: t(`notification:${notification.type}.verb`),
    action_object: t(`notification:${notification.type}.object`),
    project_name: project.name,
    board_name: boardForNotification.name,
    list_name: (list && list.name) || (card && card.list && card.list.name) || '',
    card_title: (card && card.name) || boardForNotification.name,
    card_id: (card && card.id) || '',
    card_url: specificUrl,
    cta_button_text: ctaButtonText,
    is_board_notification: isBoardNotification,

    // Traduções para labels e descrições
    email_label_comment: t('email:label:comment'),
    email_label_moved: t('email:label:moved'),
    email_label_addedMember: t('email:label:addedMember'),
    email_label_mentioned: t('email:label:mentioned'),
    email_label_dueDateChanged: t('email:label:dueDateChanged'),
    email_label_newTask: t('email:label:newTask'),
    email_label_taskCompleted: t('email:label:taskCompleted'),
    email_label_cardTitle: t('email:label:cardTitle'),
    email_label_cardMovement: t('email:label:cardMovement'),
    email_label_dueDateSet: t('email:label:dueDateSet'),
    email_label_newTaskCreated: t('email:label:newTaskCreated'),
    email_label_addedToCard: t('email:label:addedToCard'),
    email_label_addedToBoard: t('email:label:addedToBoard'),
    email_label_dueDateCard: t('email:label:dueDateCard'),
    email_action_moveCard: t('email:action:moveCard'),
    email_action_setDueDate: t('email:action:setDueDate'),
    email_action_createTask: t('email:action:createTask'),
    email_action_completeTask: t('email:action:completeTask'),
    email_dueDate: t('email:dueDate'),

    // Traduções para descrições
    email_description_addedMember: t('email:description:addedMember'),
    email_description_dueDateChanged: t('email:description:dueDateChanged'),
    email_description_newTask: t('email:description:newTask'),
    email_description_taskCompleted: t('email:description:taskCompleted'),
  };
};
