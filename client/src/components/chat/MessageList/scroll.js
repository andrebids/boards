export const BOTTOM_PROXIMITY_THRESHOLD = 48;

export const isNearBottom = (
  { clientHeight, scrollHeight, scrollTop },
  threshold = BOTTOM_PROXIMITY_THRESHOLD,
) => scrollHeight - scrollTop - clientHeight <= threshold;

export const getMessageIdentity = ({ clientMessageId, id, localId }) =>
  clientMessageId || id || localId;

export const getMessageIdentities = (messages) =>
  new Set(messages.map(getMessageIdentity).filter(Boolean));

export const getAddedMessages = (previousIdentities, messages) =>
  messages.filter((message) => !previousIdentities.has(getMessageIdentity(message)));

export const getScrollBehavior = () => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }

  return 'smooth';
};
