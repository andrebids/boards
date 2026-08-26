/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { extractMentionIds, formatTextWithMentions } = require('./mentions');

const DIRECT_CONVERSATION_TYPE = 'projectDirect';
const GROUP_CONVERSATION_TYPE = 'projectGroup';
const MAX_PREVIEW_LENGTH = 160;

const COPY_BY_LANGUAGE = {
  de: {
    attachment: 'Hat eine Datei gesendet',
    general: 'Allgemein',
    reply: 'Antworten',
    title: (sender, conversation) => `${sender} in ${conversation}`,
  },
  en: {
    attachment: 'Sent a file',
    general: 'General',
    reply: 'Reply',
    title: (sender, conversation) => `${sender} in ${conversation}`,
  },
  es: {
    attachment: 'Ha enviado un archivo',
    general: 'General',
    reply: 'Responder',
    title: (sender, conversation) => `${sender} en ${conversation}`,
  },
  fr: {
    attachment: 'A envoyé un fichier',
    general: 'Général',
    reply: 'Répondre',
    title: (sender, conversation) => `${sender} dans ${conversation}`,
  },
  pt: {
    attachment: 'Enviou um ficheiro',
    general: 'Geral',
    reply: 'Responder',
    title: (sender, conversation) => `${sender} em ${conversation}`,
  },
};

const getCopy = (language, translate) => {
  const fallback = COPY_BY_LANGUAGE[String(language || '').slice(0, 2)] || COPY_BY_LANGUAGE.en;
  if (typeof translate !== 'function') {
    return fallback;
  }

  const translateOrFallback = (key, fallbackValue, ...values) => {
    const translated = translate(key, ...values);
    return translated && translated !== key ? translated : fallbackValue;
  };

  return {
    attachment: translateOrFallback('webPush:attachment', fallback.attachment),
    general: translateOrFallback('webPush:general', fallback.general),
    reply: translateOrFallback('webPush:reply', fallback.reply),
    title: (sender, conversation) =>
      translateOrFallback(
        'webPush:title',
        fallback.title(sender, conversation),
        sender,
        conversation,
      ),
  };
};

const normalizeSingleLine = (value) =>
  String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

const truncatePreview = (value) => {
  const normalized = normalizeSingleLine(formatTextWithMentions(String(value || '')));
  return normalized.length > MAX_PREVIEW_LENGTH
    ? `${normalized.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
    : normalized;
};

const getTargets = (conversation, recipientUserIds, senderUserId, text) => {
  const mentionUserIds = new Set(extractMentionIds(text));
  return [...new Set(recipientUserIds)]
    .filter((userId) => userId !== senderUserId)
    .map((userId) => {
      let kind = 'general';
      if (mentionUserIds.has(userId)) {
        kind = 'mention';
      } else if (conversation.type === DIRECT_CONVERSATION_TYPE) {
        kind = 'direct';
      }
      return { userId, kind };
    });
};

const buildPayload = ({
  conversation,
  hasAttachment = false,
  message,
  project,
  recipient,
  sender,
  translate,
}) => {
  const copy = getCopy(recipient.language, translate);
  let conversationName = normalizeSingleLine(conversation.title);
  if (!conversationName) {
    conversationName =
      conversation.type === GROUP_CONVERSATION_TYPE
        ? copy.general
        : normalizeSingleLine(project.name);
  }

  const preview = truncatePreview(message.text);
  return {
    version: 1,
    title: copy.title(normalizeSingleLine(sender.name), conversationName),
    body: preview || (hasAttachment ? copy.attachment : ''),
    projectId: String(project.id),
    conversationId: String(conversation.id),
    messageId: String(message.id),
    replyActionLabel: copy.reply,
  };
};

const getSendOptions = () => ({
  TTL: 600,
  urgency: 'high',
  timeout: 10000,
});

const classifyWebPushError = (error) => {
  const code = error && error.code;
  if (code === 'INVALID_SUBSCRIPTION' || code === 'WEB_PUSH_CONFIG') {
    return 'permanent';
  }
  const statusCode = Number(error && error.statusCode);
  if (statusCode === 404 || statusCode === 410) {
    return 'expired';
  }
  if (statusCode === 429 || statusCode >= 500) {
    return 'retry';
  }
  if (
    ['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'ETIMEDOUT'].includes(code) ||
    String(code || '').startsWith('UND_ERR_')
  ) {
    return 'retry';
  }
  return 'permanent';
};

module.exports = {
  buildPayload,
  classifyWebPushError,
  getSendOptions,
  getTargets,
  truncatePreview,
};
