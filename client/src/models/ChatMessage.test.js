import ChatMessage from './ChatMessage';
import ActionTypes from '../constants/ActionTypes';

describe('ChatMessage optimistic reconciliation', () => {
  test('removes persisted history while preserving pending and failed local messages', () => {
    const messages = [
      { id: '41', conversationId: 'conversation-1', delete: jest.fn() },
      {
        id: 'local:pending',
        conversationId: 'conversation-1',
        isPending: true,
        delete: jest.fn(),
      },
      {
        id: 'local:failed',
        conversationId: 'conversation-1',
        isFailed: true,
        delete: jest.fn(),
      },
      { id: '43', conversationId: 'conversation-1', delete: jest.fn() },
    ];
    const model = {
      filter: jest.fn(() => ({ toModelArray: () => messages })),
    };

    ChatMessage.reducer(
      {
        type: ActionTypes.CHAT_CONVERSATION_HISTORY_CLEAR__SUCCESS,
        payload: {
          historyState: {
            conversationId: 'conversation-1',
            historyClearedThroughMessageId: '42',
          },
        },
      },
      model,
    );

    expect(messages[0].delete).toHaveBeenCalledTimes(1);
    expect(messages[1].delete).not.toHaveBeenCalled();
    expect(messages[2].delete).not.toHaveBeenCalled();
    expect(messages[3].delete).not.toHaveBeenCalled();
  });

  test('adds the latest message received through a conversation summary update', () => {
    const lastMessage = {
      id: 'message-1',
      conversationId: 'conversation-1',
      userId: 'user-2',
      text: 'New message',
    };
    const model = {
      upsert: jest.fn(),
    };

    ChatMessage.reducer(
      {
        type: ActionTypes.CHAT_CONVERSATION_UPDATE_HANDLE,
        payload: {
          conversation: {
            id: 'conversation-1',
            lastMessage,
          },
        },
      },
      model,
    );

    expect(model.upsert).toHaveBeenCalledWith(lastMessage);
  });

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

  test('confirms an attachment without duplicating it and clears its pending state', () => {
    const messageModel = {
      attachments: [{ id: 'attachment-1', name: 'old name' }],
      pendingFiles: [
        {
          clientAttachmentId: 'client-attachment-1',
          file: { name: 'image.png' },
          status: 'uploading',
        },
      ],
      update: jest.fn(),
    };
    const model = { withId: jest.fn(() => messageModel) };
    const attachment = {
      id: 'attachment-1',
      clientAttachmentId: 'client-attachment-1',
      name: 'image.png',
    };

    ChatMessage.reducer(
      {
        type: 'CHAT_MESSAGE_ATTACHMENT_CREATE_HANDLE',
        payload: { messageId: 'message-1', attachment },
      },
      model,
    );

    expect(messageModel.update).toHaveBeenCalledWith({
      attachments: [attachment],
      pendingFiles: [],
    });
  });

  test('marks only an uncertain attachment when its request times out', () => {
    const pendingFile = {
      clientAttachmentId: 'client-attachment-1',
      file: { name: 'image.png' },
      status: 'uploading',
    };
    const messageModel = {
      isFailed: false,
      pendingFiles: [pendingFile],
      update: jest.fn(),
    };
    const model = { withId: jest.fn(() => messageModel) };
    const error = { code: 'E_HTTP_TIMEOUT' };

    ChatMessage.reducer(
      {
        type: 'CHAT_MESSAGE_ATTACHMENT_UPLOAD__FAILURE',
        payload: {
          messageId: 'message-1',
          clientAttachmentId: 'client-attachment-1',
          status: 'unknown',
          error,
        },
      },
      model,
    );

    expect(messageModel.update).toHaveBeenCalledWith({
      pendingFiles: [{ ...pendingFile, status: 'unknown', error }],
    });
    expect(messageModel.isFailed).toBe(false);
  });
});
