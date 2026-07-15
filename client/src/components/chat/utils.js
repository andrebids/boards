export const isGeneralConversation = (conversation) =>
  ['project_group', 'projectGroup', 'general'].includes(conversation.type);

export const isCustomGroupConversation = (conversation) =>
  conversation?.type === 'projectCustomGroup';

export const isDirectConversation = (conversation) => conversation?.type === 'projectDirect';

export const hasUnreadMessages = (conversation) => (conversation?.unreadCount || 0) > 0;

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

export const getParticipantUserIds = (conversation) =>
  conversation.participantUserIds ||
  conversation.userIds ||
  (conversation.participants || []).map((participant) =>
    typeof participant === 'string' ? participant : participant.userId,
  );

export const getDirectUser = (conversation, members, currentUserId) => {
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
