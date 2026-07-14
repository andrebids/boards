import ChatMessage from './ChatMessage';
import ActionTypes from '../constants/ActionTypes';

describe('ChatMessage optimistic reconciliation', () => {
  test.each([ActionTypes.CHAT_MESSAGE_CREATE_HANDLE, ActionTypes.CHAT_MESSAGE_UPDATE_HANDLE])(
    'replaces the optimistic message when receiving %s',
    (type) => {
      const optimisticMessage = {
        id: 'local:message-1',
        localId: 'local:message-1',
        clientMessageId: 'client-message-1',
        conversationId: 'conversation-1',
        userId: 'user-1',
        delete: jest.fn(),
      };
      const persistedMessage = {
        id: 'message-1',
        clientMessageId: 'client-message-1',
        conversationId: 'conversation-1',
        userId: 'user-1',
      };
      const model = {
        filter: jest.fn((predicate) => ({
          toModelArray: () => [optimisticMessage].filter(predicate),
        })),
        upsert: jest.fn(),
      };

      ChatMessage.reducer(
        {
          type,
          payload: { message: persistedMessage },
        },
        model,
      );

      expect(optimisticMessage.delete).toHaveBeenCalledTimes(1);
      expect(model.upsert).toHaveBeenCalledWith({
        ...persistedMessage,
        isPending: false,
        isFailed: false,
      });
    },
  );

  test('does not reconcile messages from another user or conversation', () => {
    const unrelatedMessages = [
      {
        id: 'local:message-2',
        localId: 'local:message-2',
        clientMessageId: 'client-message-1',
        conversationId: 'conversation-2',
        userId: 'user-1',
        delete: jest.fn(),
      },
      {
        id: 'local:message-3',
        localId: 'local:message-3',
        clientMessageId: 'client-message-1',
        conversationId: 'conversation-1',
        userId: 'user-2',
        delete: jest.fn(),
      },
    ];
    const persistedMessage = {
      id: 'message-1',
      clientMessageId: 'client-message-1',
      conversationId: 'conversation-1',
      userId: 'user-1',
    };
    const model = {
      filter: jest.fn((predicate) => ({
        toModelArray: () => unrelatedMessages.filter(predicate),
      })),
      upsert: jest.fn(),
    };

    ChatMessage.reducer(
      {
        type: ActionTypes.CHAT_MESSAGE_UPDATE_HANDLE,
        payload: { message: persistedMessage },
      },
      model,
    );

    unrelatedMessages.forEach((message) => {
      expect(message.delete).not.toHaveBeenCalled();
    });
  });
});
