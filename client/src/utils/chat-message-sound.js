const CHAT_MESSAGE_SOUND_URL = '/sounds/chat-message.mp3';
const CHAT_MESSAGE_SOUND_VOLUME = 0.5;

export const shouldPlayChatMessageSound = (
  message,
  currentUserId,
  openConversationIds,
  minimizedConversationIds,
) =>
  message.userId !== currentUserId &&
  (!openConversationIds.includes(message.conversationId) ||
    minimizedConversationIds.includes(message.conversationId));

export const playChatMessageSound = () => {
  if (typeof Audio === 'undefined') {
    return;
  }

  const audio = new Audio(CHAT_MESSAGE_SOUND_URL);
  audio.volume = CHAT_MESSAGE_SOUND_VOLUME;
  audio.play().catch(() => undefined);
};
