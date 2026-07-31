import { formatTextWithMentions } from '../../../utils/mentions';

export const shouldShowMessagePreview = (alert, windows, isConversationListOpen) =>
  Boolean(
    alert && !isConversationListOpen && !windows.some(({ id }) => id === alert.conversationId),
  );

export const getMessagePreviewText = (lastMessage, t) => {
  if (!lastMessage) {
    return t('chat.newMessageAlert');
  }
  if (lastMessage.deletedAt) {
    return t('chat.messageDeleted');
  }
  if (lastMessage.attachments?.length > 0 && !lastMessage.text) {
    return t('chat.sentFile');
  }

  return formatTextWithMentions(lastMessage.text || '') || t('chat.sentFile');
};
