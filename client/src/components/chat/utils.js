export const isGeneralConversation = (conversation) =>
  ['project_group', 'projectGroup', 'general'].includes(conversation.type);

export const isCustomGroupConversation = (conversation) =>
  conversation?.type === 'projectCustomGroup';

export const hasUnreadMessages = (conversation) => (conversation?.unreadCount || 0) > 0;

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
