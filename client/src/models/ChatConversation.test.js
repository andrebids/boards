import ChatConversation from './ChatConversation';
import ActionTypes from '../constants/ActionTypes';

const reduceConversation = (conversation, type, readState) => {
  ChatConversation.reducer(
    {
      type,
      payload: { readState },
    },
    {
      withId: (id) => (id === conversation.id ? conversation : null),
    },
  );
};

describe('ChatConversation read state', () => {
  test('clears unread messages when the read cursor reaches the latest message', () => {
    const conversation = {
      id: '10',
      lastMessage: { id: '42' },
      unreadCount: 3,
    };

    reduceConversation(conversation, ActionTypes.CHAT_CONVERSATION_READ__SUCCESS, {
      conversationId: '10',
      lastReadMessageId: '42',
      unreadCount: 0,
    });

    expect(conversation.unreadCount).toBe(0);
  });

  test('does not let a stale read response erase a newer unread update', () => {
    const conversation = {
      id: '10',
      lastMessage: { id: '43' },
      unreadCount: 1,
    };

    reduceConversation(conversation, ActionTypes.CHAT_CONVERSATION_READ__SUCCESS, {
      conversationId: '10',
      lastReadMessageId: '42',
      unreadCount: 0,
    });

    expect(conversation.unreadCount).toBe(1);
  });

  test('accepts a server unread count for messages after the read cursor', () => {
    const conversation = {
      id: '10',
      lastMessage: { id: '43' },
      unreadCount: 0,
    };

    reduceConversation(conversation, ActionTypes.CHAT_CONVERSATION_READ_HANDLE, {
      conversationId: '10',
      lastReadMessageId: '42',
      unreadCount: 1,
    });

    expect(conversation.unreadCount).toBe(1);
  });
});
