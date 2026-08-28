export const isGeneralConversation = (conversation) =>
  ['project_group', 'projectGroup', 'general'].includes(conversation.type);

export const isCustomGroupConversation = (conversation) =>
  conversation?.type === 'projectCustomGroup';

export const isChatParticipantPinned = (participant, isPinnedByDefault = false) =>
  participant?.isPinned ?? isPinnedByDefault;

export const isDirectConversation = (conversation) => conversation?.type === 'projectDirect';

export const hasUnreadMessages = (conversation) => (conversation?.unreadCount || 0) > 0;

export const shouldConcealChatDock = (isConversationListOpen, isConversationListClosing) =>
  isConversationListOpen && !isConversationListClosing;

export const getChatParticipantMuteExpiration = (participant) => {
  if (!participant?.mutedUntil || participant.notificationLevel === 'none') {
    return null;
  }

  const expiration = new Date(participant.mutedUntil).getTime();
  return Number.isFinite(expiration) ? expiration : null;
};

export const isChatParticipantMuted = (participant, now = Date.now()) => {
  if (!participant) {
    return false;
  }

  if (participant.notificationLevel === 'none') {
    return true;
  }

  const expiration = getChatParticipantMuteExpiration(participant);
  const currentTime = now instanceof Date ? now.getTime() : Number(now);

  return expiration !== null && Number.isFinite(currentTime) && expiration > currentTime;
};

export const isChatParticipantMentionsOnly = (participant, now = Date.now()) =>
  participant?.notificationLevel === 'mentions' && !isChatParticipantMuted(participant, now);

export const getClipboardImageFiles = (clipboardData) => {
  if (!clipboardData) {
    return [];
  }

  const files = Array.from(clipboardData.files || []).filter((file) =>
    file.type.startsWith('image/'),
  );

  if (files.length > 0) {
    return files;
  }

  return Array.from(clipboardData.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
};

const CHAT_IMAGE_OPTIMIZATION_MIN_BYTES = 10 * 1024 * 1024;
const CHAT_WEBP_OPTIMIZATION_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const CHAT_WEBP_QUALITY = 0.9;

const convertChatImageToWebp = async (file) => {
  const image = await window.createImageBitmap(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is unavailable');
    }

    context.drawImage(image, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image conversion failed'));
          }
        },
        'image/webp',
        CHAT_WEBP_QUALITY,
      );
    });
  } finally {
    image.close?.();
  }
};

export const prepareChatAttachmentFiles = (files, convertImage = convertChatImageToWebp) =>
  Promise.all(
    files.map(async (file) => {
      if (
        !CHAT_WEBP_OPTIMIZATION_MIME_TYPES.has(file.type) ||
        file.size < CHAT_IMAGE_OPTIMIZATION_MIN_BYTES
      ) {
        return file;
      }

      try {
        const optimizedBlob = await convertImage(file);
        if (
          optimizedBlob.type !== 'image/webp' ||
          optimizedBlob.size === 0 ||
          optimizedBlob.size >= file.size
        ) {
          return file;
        }

        const name = /\.(?:jpe?g|png)$/i.test(file.name)
          ? file.name.replace(/\.(?:jpe?g|png)$/i, '.webp')
          : `${file.name}.webp`;

        return new File([optimizedBlob], name, {
          type: optimizedBlob.type,
          lastModified: file.lastModified,
        });
      } catch {
        return file;
      }
    }),
  );

export const getParticipantUserIds = (conversation) =>
  conversation.participantUserIds ||
  conversation.userIds ||
  (conversation.participants || []).map((participant) =>
    typeof participant === 'string' ? participant : participant.userId,
  );

export const getDirectUser = (conversation, members, currentUserId) => {
  if (!isDirectConversation(conversation)) {
    return undefined;
  }

  const participantIds = getParticipantUserIds(conversation);
  const otherUserId = participantIds.find((userId) => userId !== currentUserId);

  return (
    members.find((member) => member.id === otherUserId) ||
    conversation.participantUsers?.find((user) => user.id === otherUserId)
  );
};

export const getConversationTitle = (
  conversation,
  members,
  currentUserId,
  projectName,
  { conversationTitle, generalTitle },
) => {
  if (isGeneralConversation(conversation)) {
    return `${generalTitle} — ${projectName}`;
  }

  if (isCustomGroupConversation(conversation)) {
    return conversation.title || conversationTitle;
  }

  return (
    conversation.name ||
    getDirectUser(conversation, members, currentUserId)?.name ||
    conversationTitle
  );
};
