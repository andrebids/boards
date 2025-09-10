/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const escapeMarkdown = require('escape-markdown');
const escapeHtml = require('escape-html');

const { formatTextWithMentions } = require('../../../utils/mentions');

const buildTitle = (notification, t) => {
  let baseTitle;
  switch (notification.type) {
    case Notification.Types.MOVE_CARD:
      baseTitle = t('Card Moved');
      break;
    case Notification.Types.COMMENT_CARD:
      baseTitle = t('New Comment');
      break;
    case Notification.Types.ADD_MEMBER_TO_CARD:
      baseTitle = t('You Were Added to Card');
      break;
    case Notification.Types.MENTION_IN_COMMENT:
      baseTitle = t('You Were Mentioned in Comment');
      break;
    default:
      return null;
  }
  return `Blachere Boards: ${baseTitle}`;
};

const buildBodyByFormat = (board, card, notification, actorUser, t) => {
  const markdownCardLink = `[${escapeMarkdown(card.name)}](${sails.config.custom.baseUrl}/cards/${card.id})`;
  const htmlCardLink = `<a href="${sails.config.custom.baseUrl}/cards/${card.id}">${escapeHtml(card.name)}</a>`;

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

const buildAndSendNotifications = async (services, board, card, notification, actorUser, t, inputs) => {
  // ✅ Se templates estão ativos, usar HTML dos templates para serviços HTML
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      const notifiableUser = inputs.notifiableUser;
      
      // Verificar se algum serviço usa formato HTML
      const hasHtmlService = services.some(service => service.format === 'html');
      
      if (hasHtmlService) {
        // Gerar HTML dos templates apenas se houver serviços HTML
        const templateHtml = await buildAndSendEmailWithTemplates(board, card, notification, actorUser, notifiableUser, t, inputs);
        
        // Criar body com HTML dos templates
        const bodyByFormat = buildBodyByFormat(board, card, notification, actorUser, t);
        const bodyWithTemplates = {
          ...bodyByFormat,
          html: templateHtml // Substituir HTML padrão pelos templates
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

// ✅ Sistema de templates com fallback
const EMAIL_TEMPLATES_ENABLED = process.env.EMAIL_TEMPLATES_ENABLED === 'true';

const buildAndSendEmail = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  if (EMAIL_TEMPLATES_ENABLED) {
    try {
      await buildAndSendEmailWithTemplates(board, card, notification, actorUser, notifiableUser, t, inputs);
    } catch (error) {
      sails.log.error('❌ Erro nos templates, usando fallback para HTML inline:', error);
      await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
    }
  } else {
    await buildAndSendEmailLegacy(board, card, notification, actorUser, notifiableUser, t);
  }
};

const buildAndSendEmailWithTemplates = async (board, card, notification, actorUser, notifiableUser, t, inputs) => {
  const project = inputs.project || board.project;
  const currentList = inputs.list || card.list;
  const listName = currentList ? sails.helpers.lists.makeName(currentList) : 'Lista';
  
  // Dados específicos por tipo de notificação
  const getNotificationSpecificData = (notification, actorUser, t, card, currentList) => {
    switch (notification?.type) {
      case Notification.Types.MOVE_CARD: {
        const fromListName = notification?.data?.fromList ? 
          sails.helpers.lists.makeName(notification.data.fromList) : 'Lista Origem';
        const toListName = notification?.data?.toList ? 
          sails.helpers.lists.makeName(notification.data.toList) : 'Lista Destino';
        return {
          from_list: escapeHtml(fromListName),
          to_list: escapeHtml(toListName),
          action_verb: 'moveu',
          action_object: 'o cartão',
          notification_type_label: 'Movimento',
          type_background_color: '#eff8ff',
          type_border_color: '#b2ddff',
          type_text_color: '#175cd3',
        };
      }
      case Notification.Types.COMMENT_CARD:
        return {
          action_verb: 'comentou',
          action_object: 'o cartão',
          notification_type_label: 'Comentário',
          type_background_color: '#f0f9ff',
          type_border_color: '#7dd3fc',
          type_text_color: '#0369a1',
        };
      case Notification.Types.ADD_MEMBER_TO_CARD:
        return {
          action_verb: 'adicionou-o',
          action_object: 'ao cartão',
          notification_type_label: 'Membro Adicionado',
          type_background_color: '#f0fdf4',
          type_border_color: '#86efac',
          type_text_color: '#166534',
        };
      case Notification.Types.MENTION_IN_COMMENT:
        return {
          action_verb: 'mencionou-o',
          action_object: 'num comentário',
          notification_type_label: 'Menção',
          type_background_color: '#fef3c7',
          type_border_color: '#fcd34d',
          type_text_color: '#92400e',
        };
      default:
        return {};
    }
  };
  
  const templateData = {
    actor_name: escapeHtml(actorUser?.name || 'Utilizador'),
    card_title: escapeHtml(card?.name || 'Carta'),
    card_id: card?.id || '',
    project_name: escapeHtml(project?.name || board?.name || 'Projeto'),
    board_name: escapeHtml(board?.name || 'Quadro'),
    list_name: escapeHtml(listName),
    card_url: `${sails.config.custom?.baseUrl || 'http://localhost:3000'}/cards/${card?.id || ''}`,
    planka_base_url: sails.config.custom?.baseUrl || 'http://localhost:3000',
    logo_url: `cid:logo@planka`, // CID para anexo inline
    send_date: new Date().toLocaleDateString('pt-PT'),
    user_email: notifiableUser?.email || 'utilizador@exemplo.com',
    current_year: new Date().getFullYear(),
    
    // Null-safe
    comment_excerpt: notification?.data?.text ? 
      escapeHtml(notification.data.text.substring(0, 100) + '...') : 
      'Sem comentário',
    due_date: card?.dueDate ? 
      new Date(card.dueDate).toLocaleDateString('pt-PT') : 
      'Sem prazo',
    
    // Avatar do utilizador
    actor_avatar_url: actorUser?.avatar?.dirname && actorUser?.avatar?.extension ? 
      `${sails.config.custom?.baseUrl || 'http://localhost:3000'}/api/avatars/${actorUser.avatar.dirname}/cover-180.${actorUser.avatar.extension}` : 
      `${sails.config.custom?.baseUrl || 'http://localhost:3000'}/default-avatar.png`,
    actor_avatar_alt: escapeHtml(actorUser?.name || 'Utilizador'),
    
    // Dados específicos do tipo
    ...getNotificationSpecificData(notification, actorUser, t, card, currentList),
  };

  const html = await sails.helpers.utils.compileEmailTemplate.with({
    templateName: notification?.type || 'comment-card',
    data: templateData,
  });

  // Retornar HTML para uso no Apprise
  return html;
};

// ✅ Fallback para HTML inline (método antigo)
const buildAndSendEmailLegacy = async (board, card, notification, actorUser, notifiableUser, t) => {
  const cardLink = `<a href="${sails.config.custom.baseUrl}/cards/${card.id}">${escapeHtml(card.name)}</a>`;
  const boardLink = `<a href="${sails.config.custom.baseUrl}/boards/${board.id}">${escapeHtml(board.name)}</a>`;

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
      required: true,
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    if (values.user) {
      values.userId = values.user.id;
    }

    const isCommentRelated =
      values.type === Notification.Types.COMMENT_CARD ||
      values.type === Notification.Types.MENTION_IN_COMMENT;

    if (isCommentRelated) {
      values.commentId = values.comment.id;
    } else {
      values.actionId = values.action.id;
    }

    const notification = await Notification.qm.createOne({
      ...values,
      creatorUserId: values.creatorUser.id,
      boardId: values.card.boardId,
      cardId: values.card.id,
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
          lists: [inputs.list],
          cards: [values.card],
          ...(isCommentRelated
            ? {
                comments: [values.comment],
              }
            : {
                actions: [values.action],
              }),
        },
      }),
      user: values.creatorUser,
    });

    sails.log.debug(
      `[GLOBAL_NOTIFICATIONS] A processar notificação do tipo "${notification.type}" para o utilizador ID: ${notification.userId}`,
    );

    // --- LÓGICA DE ENVIO DE NOTIFICAÇÕES ---

    const globalNotificationsEnabled = sails.config.custom.globalNotifications?.enabled;
    const notificationServices = await NotificationService.qm.getByUserId(notification.userId);
    const smtpIsEnabled = sails.hooks.smtp.isEnabled();

    if (globalNotificationsEnabled || notificationServices.length > 0 || smtpIsEnabled) {
      const notifiableUser = values.user || (await User.qm.getOneById(notification.userId));
      const t = sails.helpers.utils.makeTranslator(notifiableUser.language);
      const emailHtml = await buildAndSendEmailWithTemplates(
        inputs.board, values.card, notification, values.creatorUser, notifiableUser, t, inputs,
      );
      const emailData = getNotificationSpecificData(
        notification, values.creatorUser, t, values.card, inputs.list, inputs.board,
      );

      // PRIORIDADE 1: Notificações Globais
      if (globalNotificationsEnabled) {
        sails.log.info(
          `[GLOBAL_NOTIFICATIONS] A tentar envio global para "${notifiableUser.email}"...`,
        );
        try {
          await sails.helpers.utils.sendGlobalNotification.with({
            to: notifiableUser.email,
            subject: buildTitle(notification, t),
            html: emailHtml,
            data: emailData,
          });
        } catch (error) {
          sails.log.error(
            `[GLOBAL_NOTIFICATIONS] Falha no envio global.`,
            error,
          );
        }
      }
    }

    return notification;
  },
};

const getNotificationSpecificData = (notification, creatorUser, t, card, list, board) => {
  const cardUrl = `${sails.config.custom.baseUrl}/cards/${card.id}`;
  const boardForNotification = board || card.board; // Usa o board passado, com fallback para o do cartão

  // Medida de segurança para evitar crashes se os dados estiverem incompletos
  if (!boardForNotification || !boardForNotification.project) {
    sails.log.warn('Dados do quadro ou do projeto em falta para a notificação (ID do cartão: %s)', card.id);
    return {
      actor_name: creatorUser.name,
      action_verb: t(`notification:${notification.type}.verb`),
      action_object: t(`notification:${notification.type}.object`),
      project_name: 'Projeto desconhecido',
      board_name: 'Quadro desconhecido',
      list_name: list ? list.name : card.list?.name || 'Lista desconhecida',
      card_title: card.name,
      card_id: card.id,
      card_url: cardUrl,
    };
  }

  return {
    actor_name: creatorUser.name,
    action_verb: t(`notification:${notification.type}.verb`),
    action_object: t(`notification:${notification.type}.object`),
    project_name: boardForNotification.project.name,
    board_name: boardForNotification.name,
    list_name: list ? list.name : card.list.name,
    card_title: card.name,
    card_id: card.id,
    card_url: cardUrl,
  };
};
