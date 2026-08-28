import ChatConversation from './ChatConversation';
import ChatParticipant from './ChatParticipant';
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
  test('clears the unread state and last message of the fixed General conversation', () => {
    const conversation = { id: '10', update: jest.fn() };

    ChatConversation.reducer(
      {
        type: ActionTypes.CHAT_CONVERSATION_HISTORY_CLEAR__SUCCESS,
        payload: {
          historyState: {
            conversationId: '10',
            conversationType: 'projectGroup',
            historyClearedThroughMessageId: '42',
          },
        },
      },
      { withId: () => conversation },
    );

    expect(conversation.update).toHaveBeenCalledWith({
      unreadCount: 0,
      lastMessage: null,
      lastMessageAt: null,
    });
  });

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

describe('ChatParticipant read state', () => {
  test('does not move the participant read cursor backwards on an older response', () => {
    const participant = {
      lastReadMessageId: '43',
      update: jest.fn(),
    };

    ChatParticipant.reducer(
      {
        type: ActionTypes.CHAT_CONVERSATION_READ__SUCCESS,
        payload: {
          readState: {
            conversationId: '10',
            userId: '1',
            lastReadMessageId: '42',
            lastReadAt: '2026-08-25T09:00:00.000Z',
          },
        },
      },
      {
        filter: () => ({ first: () => participant }),
      },
    );

    expect(participant.update).not.toHaveBeenCalled();
  });
});
