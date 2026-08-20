/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { extractMentionIds, formatTextWithMentions } = require('./mentions');

const DIRECT_CONVERSATION_TYPE = 'projectDirect';
const PROJECT_GROUP_CONVERSATION_TYPE = 'projectGroup';
const MAX_MESSAGE_PREVIEW_LENGTH = 500;

const COPY_BY_LANGUAGE = {
  en: {
    attachment: 'Attachment',
    directIntroduction: 'A direct chat message has remained unread for at least one hour.',
    digestIntroduction: (count) =>
      `${count} chat messages have remained unread for at least one hour.`,
    footer: 'You are receiving this email because these chat notifications are still unread.',
    general: 'General',
    greeting: (name) => `Hello ${name},`,
    mentionIntroduction: 'A chat mention has remained unread for at least one hour.',
    openConversation: 'OPEN CONVERSATION',
    conversation: 'Conversation',
    project: 'Project',
    subjectDirect: 'Unread direct message',
    subjectDigest: (count) => `${count} unread chat messages`,
    subjectMention: 'Unread chat mention',
  },
  fr: {
    attachment: 'Pièce jointe',
    directIntroduction: 'Un message direct du chat est resté non lu pendant au moins une heure.',
    digestIntroduction: (count) =>
      `${count} messages du chat sont restés non lus pendant au moins une heure.`,
    footer: 'Vous recevez cet e-mail parce que ces notifications du chat sont toujours non lues.',
    general: 'Général',
    greeting: (name) => `Bonjour ${name},`,
    mentionIntroduction: 'Une mention dans le chat est restée non lue pendant au moins une heure.',
    openConversation: 'OUVRIR LA CONVERSATION',
    conversation: 'Conversation',
    project: 'Projet',
    subjectDirect: 'Message direct non lu',
    subjectDigest: (count) => `${count} messages du chat non lus`,
    subjectMention: 'Mention non lue dans le chat',
  },
  pt: {
    attachment: 'Anexo',
    directIntroduction:
      'Uma mensagem direta do chat permaneceu por ler durante pelo menos uma hora.',
    digestIntroduction: (count) =>
      `${count} mensagens do chat permaneceram por ler durante pelo menos uma hora.`,
    footer: 'Recebeu este email porque estas notificações do chat continuam por ler.',
    general: 'Geral',
    greeting: (name) => `Olá ${name},`,
    mentionIntroduction: 'Uma menção no chat permaneceu por ler durante pelo menos uma hora.',
    openConversation: 'ABRIR CONVERSA',
    conversation: 'Conversa',
    project: 'Projeto',
    subjectDirect: 'Mensagem direta por ler',
    subjectDigest: (count) => `${count} mensagens do chat por ler`,
    subjectMention: 'Menção por ler no chat',
  },
};

const getCopy = (language) =>
  COPY_BY_LANGUAGE[String(language || '').slice(0, 2)] || COPY_BY_LANGUAGE.en;

const getTargets = (conversation, recipientUserIds, senderUserId, text) => {
  const mentionUserIds = new Set(extractMentionIds(text));
  const uniqueRecipientUserIds = [...new Set(recipientUserIds)].filter(
    (userId) => userId !== senderUserId,
  );

  return uniqueRecipientUserIds
    .filter(
      (userId) => conversation.type === DIRECT_CONVERSATION_TYPE || mentionUserIds.has(userId),
    )
    .map((userId) => ({
      userId,
      kind: mentionUserIds.has(userId) ? 'mention' : 'direct',
    }));
};

const makeMessagePreview = (text, attachmentLabel) => {
  const normalizedText = formatTextWithMentions(String(text || '')).trim();
  if (!normalizedText) {
    return attachmentLabel;
  }

  return normalizedText.length > MAX_MESSAGE_PREVIEW_LENGTH
    ? `${normalizedText.slice(0, MAX_MESSAGE_PREVIEW_LENGTH - 1)}…`
    : normalizedText;
};

const getConversationName = (conversation, project, messages, copy) => {
  if (conversation.title) {
    return conversation.title;
  }

  if (conversation.type === PROJECT_GROUP_CONVERSATION_TYPE) {
    return `${copy.general} — ${project.name}`;
  }

  const senderNames = [...new Set(messages.map(({ sender }) => sender.name))];
  return senderNames.length === 1 ? senderNames[0] : project.name;
};

const buildEmail = ({ baseUrl, conversation, messages, project, recipient }) => {
  const copy = getCopy(recipient.language);
  const conversationName = getConversationName(conversation, project, messages, copy).replace(
    /[\r\n]+/g,
    ' ',
  );
  const firstMessage = messages[0];
  const deepLink = new URL(`/projects/${project.id}`, baseUrl);
  deepLink.searchParams.set('chatConversation', conversation.id);
  deepLink.searchParams.set('chatMessage', firstMessage.id);

  let subjectLabel;
  let introduction;
  if (messages.length > 1) {
    subjectLabel = copy.subjectDigest(messages.length);
    introduction = copy.digestIntroduction(messages.length);
  } else if (firstMessage.kind === 'mention') {
    subjectLabel = copy.subjectMention;
    introduction = copy.mentionIntroduction;
  } else {
    subjectLabel = copy.subjectDirect;
    introduction = copy.directIntroduction;
  }

  const presentedMessages = messages.map((message) => ({
    ...message,
    preview: makeMessagePreview(message.text, copy.attachment),
  }));
  const textMessages = presentedMessages
    .map(({ preview, sender }) => `${sender.name}:\n${preview}`)
    .join('\n\n');
  const language = recipient.language || 'en-US';
  const currentYear = new Date().getFullYear();

  return {
    subject: `Blachere Boards: ${subjectLabel} — ${conversationName}`,
    text: `${copy.greeting(recipient.name)}

${introduction}

${copy.project}: ${project.name}
${conversationName}

${textMessages}

${deepLink.toString()}

${copy.footer}`,
    templateData: {
      card_url: deepLink.toString(),
      chat_conversation_label: copy.conversation,
      chat_conversation_name: conversationName,
      chat_footer: copy.footer,
      chat_greeting: copy.greeting(recipient.name),
      chat_introduction: introduction,
      chat_messages: presentedMessages.map(({ preview, sender }) => ({
        preview,
        sender_name: sender.name,
      })),
      cta_button_text: copy.openConversation,
      email_copyright: `© ${currentYear} Planka.`,
      email_language: language,
      is_chat_notification: true,
      notification_title: subjectLabel,
      notification_type_label: 'Chat',
      planka_base_url: baseUrl,
      project_label: copy.project,
      project_name: project.name,
      send_date: new Date().toLocaleDateString(language),
    },
    url: deepLink.toString(),
  };
};

module.exports = {
  buildEmail,
  getTargets,
  makeMessagePreview,
};
