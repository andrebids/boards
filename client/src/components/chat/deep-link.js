export const consumeReplyIntent = (
  conversationId,
  location = window.location,
  browserHistory = window.history,
) => {
  const parameters = new URLSearchParams(location.search);
  if (parameters.get('chatConversation') !== conversationId || parameters.get('reply') !== '1') {
    return false;
  }

  parameters.delete('reply');
  const search = parameters.toString();
  browserHistory.replaceState(
    browserHistory.state,
    '',
    `${location.pathname}${search ? `?${search}` : ''}${location.hash}`,
  );
  return true;
};

export default {
  consumeReplyIntent,
};
