import { all, call, put, select } from 'redux-saga/effects';
import { runSaga } from 'redux-saga';
import { createReducer } from 'redux-orm';

import actions from '../../../actions';
import api from '../../../api';
import selectors from '../../../selectors';
import orm from '../../../orm';
import chatReducer from '../../../reducers/chat';
import ActionTypes from '../../../constants/ActionTypes';
import request, { requestConcurrent } from '../request';
import { playChatMessageSound } from '../../../utils/chat-message-sound';
import chatServices, {
  fetchChatConversations,
  fetchChatMessages,
  leaveChatConversation,
  addChatConversationParticipants,
  deleteChatConversationParticipant,
  handleChatConversationUpdate,
  handleChatMessageAttachmentCreate,
  handleChatMessageCreate,
  retryChatMessageAttachment,
  uploadChatMessageAttachment,
  uploadChatMessageAttachments,
  updateChatMessage,
  updateChatTyping,
} from './chat';
import chatInboxServices, {
  fetchChatInbox,
  handleChatConversationRead,
  markChatConversationAsRead,
} from './chat-inbox';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    getChatInbox: jest.fn(),
    getChatConversations: jest.fn(),
    getChatMessages: jest.fn(),
    leaveChatConversation: jest.fn(),
    addChatConversationParticipants: jest.fn(),
    deleteChatConversationParticipant: jest.fn(),
    updateChatMessage: jest.fn(),
    updateChatTyping: jest.fn(),
    markChatConversationAsRead: jest.fn(),
    createChatMessageAttachment: jest.fn(),
  },
}));
jest.mock('../../../constants/Config', () => ({
  __esModule: true,
  default: {
    ACTIVITIES_LIMIT: 10,
    CARDS_LIMIT: 50,
    COMMENTS_LIMIT: 50,
    POSITION_GAP: 65536,
  },
}));
jest.mock('../../../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));
jest.mock('../../../sentry', () => ({ reportChatError: jest.fn() }));

describe('typing after conversation departure', () => {
  test.each([
    ['hidden', null],
    ['historical', { canWrite: false, isHistorical: true }],
    ['single member', { canWrite: false }],
    ['archived', { canWrite: true, archivedAt: '2026-09-22T00:00:00Z' }],
  ])('does not send typing cleanup for a %s conversation', (_, conversation) => {
    const generator = updateChatTyping('conversation-1', false);
    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, 'conversation-1'),
    );
    expect(generator.next(conversation).done).toBe(true);
  });

  test.each([true, false])('keeps active conversation typing=%s updates', (isTyping) => {
    const generator = updateChatTyping('conversation-1', isTyping);
    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, 'conversation-1'),
    );
    expect(generator.next({ canWrite: true }).value).toEqual(
      call(request, api.updateChatTyping, 'conversation-1', isTyping),
    );
    expect(generator.next({}).done).toBe(true);
  });
});
jest.mock('nanoid', () => {
  let nextId = 0;
  return {
    nanoid: jest.fn(() => {
      nextId += 1;
      return `request-${nextId}`;
    }),
  };
});

describe('chat inbox services', () => {
  test('exposes the inbox services used by chat watchers', () => {
    expect(chatInboxServices).toEqual(
      expect.objectContaining({
        fetchChatInbox,
        handleChatConversationRead,
        markChatConversationAsRead,
      }),
    );
  });

  test('fetches inbox summaries together with included users', () => {
    const generator = fetchChatInbox({});
    const options = { filter: 'all', limit: 50, append: false };
    expect(generator.next().value).toEqual(put(actions.fetchChatInbox(options)));
    expect(generator.next().value).toEqual(
      call(request, api.getChatInbox, { filter: 'all', limit: 50 }),
    );

    const body = {
      items: [{ conversationId: 'conversation-1' }],
      meta: { hasChatAccess: true },
      included: { users: [{ id: 'user-2' }] },
      people: [{ projectId: 'project-1', userId: 'user-2' }],
    };
    expect(generator.next(body).value).toEqual(
      put(
        actions.fetchChatInbox.success(
          body.items,
          body.meta,
          body.included.users,
          options,
          body.people,
        ),
      ),
    );
    expect(generator.next().done).toBe(true);
  });

  test('restores the active inbox request after a socket reconnect', () => {
    const generator = fetchChatInbox();
    expect(generator.next().value).toEqual(select(selectors.selectChatState));

    const inboxRequest = { filter: 'unread', query: 'alpha', limit: 30 };
    expect(generator.next({ inboxRequest }).value).toEqual(
      put(actions.fetchChatInbox({ ...inboxRequest, append: false })),
    );
    expect(generator.next().value).toEqual(call(request, api.getChatInbox, inboxRequest));
  });

  test('requests and appends an older inbox page', () => {
    const requestOptions = {
      filter: 'mentions',
      query: 'design',
      before: 'cursor-1',
      limit: 30,
    };
    const actionOptions = { ...requestOptions, append: true };
    const generator = fetchChatInbox({ ...requestOptions, append: true });

    expect(generator.next().value).toEqual(put(actions.fetchChatInbox(actionOptions)));
    expect(generator.next().value).toEqual(call(request, api.getChatInbox, requestOptions));

    const body = {
      items: [],
      meta: { hasMore: false },
      included: { users: [] },
    };
    expect(generator.next(body).value).toEqual(
      put(actions.fetchChatInbox.success([], body.meta, [], actionOptions, [])),
    );
    expect(generator.next().done).toBe(true);
  });

  test('updates a global summary without upserting an unloaded ORM conversation', () => {
    const conversation = {
      id: 'conversation-1',
      projectId: 'project-1',
      unreadCount: 2,
    };
    const generator = handleChatConversationUpdate(conversation, [], []);

    expect(generator.next().value).toEqual(put(actions.handleChatInboxItemUpdate(conversation)));
    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, conversation.id),
    );
    expect(generator.next(undefined).done).toBe(true);
  });

  test('refetches a cleared conversation when a newer message makes it visible again', () => {
    const conversation = {
      id: 'conversation-1',
      projectId: 'project-1',
      historyClearedThroughMessageId: '42',
      lastMessage: { id: '43' },
    };
    const generator = handleChatConversationUpdate(conversation, [], []);

    expect(generator.next().value).toEqual(put(actions.handleChatInboxItemUpdate(conversation)));
    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, conversation.id),
    );
    expect(generator.next(undefined).value).toEqual(
      call(fetchChatConversations, conversation.projectId),
    );
    expect(generator.next().done).toBe(true);
  });

  test('marks an inbox-only conversation as read', () => {
    const conversationId = 'conversation-1';
    const inboxItem = { conversationId, unreadCount: 3 };
    const readState = { conversationId, unreadCount: 0 };
    const generator = markChatConversationAsRead(conversationId);

    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, conversationId),
    );
    expect(generator.next(undefined).value).toEqual(select(selectors.selectChatState));
    expect(
      generator.next({
        inboxItemsByConversationId: { [conversationId]: inboxItem },
      }).value,
    ).toEqual(put(actions.markChatConversationAsRead(conversationId, inboxItem)));
    expect(generator.next().value).toEqual(
      call(request, api.markChatConversationAsRead, conversationId, {}),
    );
    expect(generator.next({ item: readState }).value).toEqual(
      select(selectors.selectChatConversationById, conversationId),
    );
    expect(generator.next(undefined).value).toEqual(select(selectors.selectChatState));
    expect(
      generator.next({
        inboxItemsByConversationId: { [conversationId]: inboxItem },
      }).value,
    ).toEqual(put(actions.markChatConversationAsRead.success(readState)));
    expect(generator.next().done).toBe(true);
  });

  test('advances the read cursor only to the visible message', () => {
    const conversationId = 'conversation-1';
    const messageId = '42';
    const conversation = { id: conversationId, unreadCount: 3 };
    const readState = {
      conversationId,
      lastReadMessageId: messageId,
      unreadCount: 1,
    };
    const generator = markChatConversationAsRead(conversationId, messageId);

    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, conversationId),
    );
    expect(generator.next(conversation).value).toEqual(select(selectors.selectChatState));
    expect(generator.next({ inboxItemsByConversationId: {} }).value).toEqual(
      call(request, api.markChatConversationAsRead, conversationId, {
        messageId,
      }),
    );
    expect(generator.next({ item: readState }).value).toEqual(
      select(selectors.selectChatConversationById, conversationId),
    );
  });

  test('plays a sound for a received message in an unopened conversation', () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      userId: 'other-user',
    };
    const generator = handleChatMessageCreate(message, []);

    expect(generator.next().value).toEqual(
      select(selectors.selectChatConversationById, message.conversationId),
    );
    expect(generator.next({ id: message.conversationId }).value).toEqual(
      select(selectors.selectCurrentUserId),
    );
    expect(generator.next('current-user').value).toEqual(
      select(selectors.selectOpenChatConversationIds),
    );
    expect(generator.next([]).value).toEqual(select(selectors.selectMinimizedChatConversationIds));
    expect(generator.next([]).value).toEqual(call(playChatMessageSound));
    expect(generator.next().value).toEqual(put(actions.handleChatMessageCreate(message, [])));
    expect(generator.next().done).toBe(true);
  });

  test('does not play a sound for a message sent by the current user', () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      userId: 'current-user',
    };
    const generator = handleChatMessageCreate(message, []);

    generator.next();
    generator.next({ id: message.conversationId });
    generator.next('current-user');
    generator.next([]);
    expect(generator.next([]).value).toEqual(put(actions.handleChatMessageCreate(message, [])));
  });
});

describe('chat attachment uploads', () => {
  const message = {
    id: 'message-1',
    clientMessageId: 'client-message-1',
  };
  const pendingFile = {
    clientAttachmentId: 'client-attachment-1',
    file: { name: 'image.png', size: 100, type: 'image/png' },
    status: 'uploading',
  };

  test('exposes the attachment services used by chat watchers', () => {
    expect(chatServices).toEqual(
      expect.objectContaining({
        handleChatMessageAttachmentCreate,
        retryChatMessageAttachment,
      }),
    );
  });

  test('uses the concurrent authenticated request and confirms the attachment', () => {
    const generator = uploadChatMessageAttachment(message, pendingFile, 1);

    expect(generator.next().value).toEqual(
      call(requestConcurrent, api.createChatMessageAttachment, message.id, {
        file: pendingFile.file,
        clientAttachmentId: pendingFile.clientAttachmentId,
      }),
    );

    const attachment = { id: 'attachment-1' };
    expect(generator.next({ item: attachment }).value).toEqual(
      put(
        actions.handleChatMessageAttachmentCreate(message.id, {
          ...attachment,
          clientAttachmentId: pendingFile.clientAttachmentId,
        }),
      ),
    );
  });

  test('starts up to three attachment requests together', () => {
    const pendingFiles = [
      pendingFile,
      { ...pendingFile, clientAttachmentId: 'client-attachment-2' },
      { ...pendingFile, clientAttachmentId: 'client-attachment-3' },
      { ...pendingFile, clientAttachmentId: 'client-attachment-4' },
    ];
    const generator = uploadChatMessageAttachments(message, pendingFiles);

    expect(generator.next().value).toEqual(
      all(
        pendingFiles
          .slice(0, 3)
          .map((item, index) =>
            call(uploadChatMessageAttachment, message, item, index + 1, pendingFiles.length),
          ),
      ),
    );
    expect(generator.next().value).toEqual(
      all([call(uploadChatMessageAttachment, message, pendingFiles[3], 4, pendingFiles.length)]),
    );
  });
});

describe('chat message edit requests', () => {
  test('reports a network failure and allows a subsequent save', () => {
    const previousMessage = { id: '10', text: 'Original' };
    const data = { text: 'Draft retained by the editor' };
    const failed = updateChatMessage('10', data);
    expect(failed.next().value).toEqual(select(selectors.selectChatMessageById, '10'));
    expect(failed.next(previousMessage).value).toEqual(put(actions.updateChatMessage('10', data)));
    expect(failed.next().value).toEqual(call(request, api.updateChatMessage, '10', data));
    const error = { code: 'E_HTTP_TIMEOUT' };
    expect(failed.throw(error).value).toEqual(
      put(actions.updateChatMessage.failure('10', previousMessage, error)),
    );
    expect(failed.next().done).toBe(true);

    const retry = updateChatMessage('10', data);
    retry.next();
    retry.next(previousMessage);
    retry.next();
    const message = { id: '10', conversationId: '20', text: data.text };
    expect(retry.next({ item: message }).value).toEqual(
      select(selectors.selectChatConversationById, '20'),
    );
    expect(retry.next({ id: '20' }).value).toEqual(put(actions.updateChatMessage.success(message)));
    expect(retry.next().done).toBe(true);
  });
});

describe('chat group lifecycle', () => {
  const group = { id: 'group-1', projectId: 'project-1', type: 'projectCustomGroup' };
  const participant = { id: 'participant-1', conversationId: group.id, userId: 'user-1' };
  const leftParticipant = {
    ...participant,
    leftAt: '2026-09-21',
    historyVisibleThroughMessageId: '42',
  };

  const makeStore = (conversation = group, open = false) => {
    // Exercise the real selector projection with an ORM session; the shared Jest
    // module path resolves a different reselect version than redux-orm's memoizer.
    const selectConversation = (state, id) =>
      selectors.selectChatConversationById.resultFunc(orm.session(state.orm), id);
    const selectMessages = (state, id) =>
      selectors.selectChatMessagesByConversationId.resultFunc(orm.session(state.orm), id);
    const session = orm.session(orm.getEmptyState());
    if (conversation) {
      session.ChatConversation.create(conversation);
      session.ChatParticipant.create(conversation.isHistorical ? leftParticipant : participant);
      session.ChatMessage.create({ id: '42', conversationId: group.id, text: 'History' });
    }
    let state = {
      orm: session.state,
      chat: {
        ...chatReducer(undefined, { type: '@@INIT' }),
        openConversationIds: open ? [group.id] : [],
      },
    };
    const reduceOrm = createReducer(orm);
    const dispatched = [];
    const dispatch = (action) => {
      dispatched.push(action);
      state = {
        ...state,
        orm: reduceOrm(state.orm, action),
        chat: chatReducer(state.chat, action),
      };
    };
    return {
      getState: () => state,
      conversation: () => selectConversation(state, group.id),
      messages: () => selectMessages(state, group.id),
      dispatch,
      dispatched,
      run: (service, ...args) =>
        runSaga(
          {
            dispatch,
            getState: () => state,
            effectMiddlewares: [
              (next) => (effect) => {
                if (effect.type === 'SELECT') {
                  if (effect.payload.selector === selectors.selectChatConversationById) {
                    return next(select(selectConversation, ...effect.payload.args));
                  }
                  if (effect.payload.selector === selectors.selectChatMessagesByConversationId) {
                    return next(select(selectMessages, ...effect.payload.args));
                  }
                }
                if (effect.type === 'CALL' && effect.payload.fn === request) {
                  return next(call(effect.payload.args[0], ...effect.payload.args.slice(1)));
                }
                return next(effect);
              },
            ],
          },
          service,
          ...args,
        ).toPromise(),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getChatMessages.mockResolvedValue({ items: [], meta: { hasMore: false } });
  });

  test('leaving keeps the historical conversation and loaded messages, even without a socket event', async () => {
    const store = makeStore();
    api.leaveChatConversation.mockResolvedValue({ item: leftParticipant });
    await store.run(leaveChatConversation, group.id);
    expect(store.conversation()).toMatchObject({ isHistorical: true, canWrite: false });
    expect(store.messages()).toHaveLength(1);
    expect(store.getState().chat.conversationUpdatesById[group.id]).toMatchObject({
      operation: 'leave',
      isPending: false,
      isSuccess: true,
    });
    expect(
      store.dispatched.some(
        ({ type }) => type === ActionTypes.CHAT_CONVERSATION_ACCESS_REVOKE_HANDLE,
      ),
    ).toBe(false);
  });

  test.each([
    ['leave', leaveChatConversation, 'leaveChatConversation', []],
    [
      'remove-member',
      deleteChatConversationParticipant,
      'deleteChatConversationParticipant',
      ['user-2'],
    ],
    [
      'add-member',
      addChatConversationParticipants,
      'addChatConversationParticipants',
      [['user-2']],
    ],
  ])(
    '%s exposes failure, preserves the conversation and prevents duplicate pending requests',
    async (operation, service, apiMethod, args) => {
      const store = makeStore();
      const error = { status: 403, message: 'No longer authorized' };
      api[apiMethod].mockRejectedValue(error);
      await store.run(service, group.id, ...args);
      expect(store.getState().chat.conversationUpdatesById[group.id]).toMatchObject({
        operation,
        isPending: false,
        isSuccess: false,
        error,
      });
      expect(store.conversation()).toBeTruthy();
      store.dispatch(actions.updateChatConversation(group.id, operation));
      await store.run(service, group.id, ...args);
      expect(api[apiMethod]).toHaveBeenCalledTimes(1);
    },
  );

  test('readmission restores a hidden conversation without a cleared-history cursor', async () => {
    const store = makeStore(null);
    api.getChatConversations.mockResolvedValue({
      items: [{ ...group, isHistorical: false, canWrite: true }],
      included: { chatParticipants: [participant] },
    });
    await store.run(
      handleChatConversationUpdate,
      { ...group, isHistorical: false, canWrite: true },
      [participant],
      [],
    );
    expect(api.getChatConversations).toHaveBeenCalledWith(group.projectId);
    expect(store.conversation()).toMatchObject({
      isHistorical: false,
      canWrite: true,
      participantUserIds: ['user-1'],
    });
  });

  test('readmission reloads absence history and subscribes an already open window', async () => {
    const store = makeStore({ ...group, isHistorical: true, canWrite: false }, true);
    api.getChatMessages.mockResolvedValue({
      items: [{ id: '50', conversationId: group.id, text: 'During absence' }],
      meta: { hasMore: true },
    });
    await store.run(
      handleChatConversationUpdate,
      { ...group, isHistorical: false, canWrite: true },
      [participant],
      [],
    );
    expect(api.getChatMessages).toHaveBeenCalledWith(group.id, {
      beforeId: undefined,
      subscribe: true,
    });
    expect(store.messages().map(({ id }) => id)).toEqual(['50']);
  });

  test('a message response started before removal cannot overwrite historical state', async () => {
    const store = makeStore();
    let resolveMessages;
    api.getChatMessages.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMessages = resolve;
        }),
    );
    const completion = store.run(fetchChatMessages, group.id, { replace: true });
    store.dispatch(
      actions.handleChatConversationUpdate(
        { ...group, isHistorical: true, canWrite: false },
        [leftParticipant],
        [],
      ),
    );
    resolveMessages({ items: [{ id: '99', conversationId: group.id }], meta: { hasMore: false } });
    await completion;
    expect(store.messages().map(({ id }) => id)).toEqual(['42']);
    expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(false);
    expect(store.getState().chat.errorsByScope[`messages:${group.id}`]).toBeNull();
  });

  test.each(['resolve', 'reject'])(
    'an obsolete request that %ss cannot stop a newer historical fetch',
    async (outcome) => {
      const store = makeStore();
      let finishOldRequest;
      let finishNewRequest;
      api.getChatMessages
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finishOldRequest = outcome === 'resolve' ? resolve : reject;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishNewRequest = resolve;
            }),
        );
      const oldCompletion = store.run(fetchChatMessages, group.id, { replace: true });
      store.dispatch(
        actions.handleChatConversationUpdate(
          { ...group, isHistorical: true, canWrite: false },
          [leftParticipant],
          [],
        ),
      );
      const newCompletion = store.run(fetchChatMessages, group.id, { replace: true });
      finishOldRequest({ items: [{ id: '99', conversationId: group.id }] });
      await oldCompletion;
      expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(true);
      expect(store.messages().map(({ id }) => id)).toEqual(['42']);
      finishNewRequest({ items: [{ id: '41', conversationId: group.id }], hasMore: false });
      await newCompletion;
      expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(false);
      expect(store.messages().map(({ id }) => id)).toEqual(['41']);
    },
  );

  test('a failed request discarded after departure still clears its own loading state', async () => {
    const store = makeStore();
    let rejectMessages;
    api.getChatMessages.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          rejectMessages = reject;
        }),
    );
    const completion = store.run(fetchChatMessages, group.id);
    store.dispatch(
      actions.handleChatConversationUpdate(
        { ...group, isHistorical: true, canWrite: false },
        [leftParticipant],
        [],
      ),
    );
    rejectMessages({ message: 'Old request denied' });
    await completion;
    expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(false);
    expect(store.getState().chat.errorsByScope[`messages:${group.id}`]).toBeNull();
  });

  test('an older fetch cannot overwrite a completed replacement in the same membership state', async () => {
    const store = makeStore();
    let resolveOldMessages;
    api.getChatMessages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOldMessages = resolve;
        }),
    );
    const oldCompletion = store.run(fetchChatMessages, group.id, { replace: true });
    api.getChatMessages.mockResolvedValueOnce({
      items: [{ id: '50', conversationId: group.id }],
      hasMore: false,
    });
    await store.run(fetchChatMessages, group.id, { replace: true });
    resolveOldMessages({ items: [{ id: '41', conversationId: group.id }], hasMore: true });
    await oldCompletion;
    expect(store.messages().map(({ id }) => id)).toEqual(['50']);
    expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(false);
    expect(store.getState().chat.hasMoreMessagesByConversation[group.id]).toBe(false);
  });

  test.each([
    actions.handleChatConversationHistoryClear({
      conversationId: group.id,
      hideConversation: true,
    }),
    actions.handleChatConversationAccessRevoke(group.projectId, group.id),
    actions.handleChatProjectAccessRevoke(group.projectId, [group.id]),
  ])('invalidates in-flight messages on $type without restoring loading state', async (action) => {
    const store = makeStore();
    let resolveMessages;
    api.getChatMessages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMessages = resolve;
        }),
    );
    const completion = store.run(fetchChatMessages, group.id, { replace: true });
    store.dispatch(action);
    resolveMessages({ items: [{ id: '99', conversationId: group.id }], hasMore: false });
    await completion;
    expect(store.messages().some(({ id }) => id === '99')).toBe(false);
    expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBeFalsy();
  });

  test('removal retains loaded history when refreshing it fails and exposes a retryable fetch error', async () => {
    const store = makeStore(group, true);
    const error = { message: 'Offline' };
    api.getChatMessages.mockRejectedValue(error);
    await store.run(
      handleChatConversationUpdate,
      { ...group, isHistorical: true, canWrite: false },
      [leftParticipant],
      [],
    );
    expect(store.messages()).toHaveLength(1);
    expect(store.getState().chat.errorsByScope[`messages:${group.id}`]).toBe(error);
    expect(store.getState().chat.isMessagesFetchingByConversation[group.id]).toBe(false);
  });
});
