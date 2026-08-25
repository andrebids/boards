export const BOTTOM_PROXIMITY_THRESHOLD = 48;

export const isNearBottom = (
  { clientHeight, scrollHeight, scrollTop },
  threshold = BOTTOM_PROXIMITY_THRESHOLD,
) => scrollHeight - scrollTop - clientHeight <= threshold;

export const shouldScrollToNewestMessage = ({ isAtBottom, message, currentUserId }) =>
  isAtBottom || message.userId === currentUserId;

export const getMessageIdentity = ({ clientMessageId, id, localId }) =>
  clientMessageId || id || localId;

export const getMessageIdentities = (messages) =>
  new Set(messages.map(getMessageIdentity).filter(Boolean));

export const getAddedMessages = (previousIdentities, messages) =>
  messages.filter((message) => !previousIdentities.has(getMessageIdentity(message)));

export const getReadHorizonMessageId = (list, messages) => {
  if (!list) return null;

  const listBounds = list.getBoundingClientRect();
  const persistedMessageIds = new Set(
    messages.filter(({ isPersisted }) => isPersisted).map(({ id }) => id),
  );
  const rows = Array.from(list.querySelectorAll('[data-chat-message-row]'));

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (persistedMessageIds.has(row.dataset.messageId)) {
      const bounds = row.getBoundingClientRect();
      if (bounds.bottom > listBounds.top && bounds.bottom <= listBounds.bottom) {
        return row.dataset.messageId;
      }
    }
  }

  return null;
};

export const getScrollBehavior = () => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }

  return 'smooth';
};
