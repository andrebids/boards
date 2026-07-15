import reducer from './chat';
import ActionTypes from '../constants/ActionTypes';

describe('chat reducer', () => {
  test('stores a normalized global inbox response and its authoritative metadata', () => {
    const state = reducer(undefined, {
      type: ActionTypes.CHAT_INBOX_FETCH__SUCCESS,
      payload: {
        items: [
          {
            conversationId: 'conversation-1',
            projectId: 'project-1',
            unreadCount: 3,
          },
        ],
        meta: {
          hasChatAccess: true,
          unreadConversationTotal: 1,
          unreadMessageTotal: 3,
          unreadConversationTotalsByProjectId: { 'project-1': 1 },
        },
      },
    });

    expect(state.inboxItemsByConversationId['conversation-1']).toMatchObject({
      conversationId: 'conversation-1',
      projectId: 'project-1',
      unreadCount: 3,
    });
    expect(state.hasFetchedInbox).toBe(true);
    expect(state.inboxMeta.unreadConversationTotal).toBe(1);
  });

  test('merges a global event into an inbox item without requiring a local conversation', () => {
    const initialState = reducer(undefined, {
      type: ActionTypes.CHAT_INBOX_FETCH__SUCCESS,
      payload: {
        items: [
          {
            conversationId: 'conversation-1',
            projectId: 'project-1',
            projectName: 'Project one',
            unreadCount: 0,
          },
        ],
        meta: {
          unreadConversationTotal: 0,
          unreadMessageTotal: 0,
          unreadConversationTotalsByProjectId: { 'project-1': 0 },
        },
      },
    });

    const state = reducer(initialState, {
      type: ActionTypes.CHAT_INBOX_ITEM_UPDATE_HANDLE,
      payload: {
        item: {
          id: 'conversation-1',
          unreadCount: 2,
          lastMessageAt: new Date('2026-07-15T12:00:00.000Z'),
        },
      },
    });

    expect(state.inboxItemsByConversationId['conversation-1']).toMatchObject({
      projectName: 'Project one',
      unreadCount: 2,
    });
    expect(state.inboxMeta).toMatchObject({
      unreadConversationTotal: 1,
      unreadMessageTotal: 2,
      unreadConversationTotalsByProjectId: { 'project-1': 1 },
    });
  });

  test('ignores partial events for items that have not been fetched', () => {
    const state = reducer(undefined, {
      type: ActionTypes.CHAT_INBOX_ITEM_UPDATE_HANDLE,
      payload: { item: { id: 'conversation-1', unreadCount: 1 } },
    });

    expect(state.inboxItemsByConversationId).toEqual({});
  });

  test('inserts complete conversation events that arrive after the inbox was fetched', () => {
    const state = reducer(undefined, {
      type: ActionTypes.CHAT_INBOX_ITEM_UPDATE_HANDLE,
      payload: {
        item: {
          id: 'conversation-1',
          projectId: 'project-1',
          title: 'New group',
          unreadCount: 1,
        },
      },
    });

    expect(state.inboxItemsByConversationId['conversation-1']).toMatchObject({
      conversationId: 'conversation-1',
      projectId: 'project-1',
      title: 'New group',
      unreadCount: 1,
    });
    expect(state.inboxMeta.hasChatAccess).toBe(true);
  });

  test('optimistically reads inbox conversations and restores only targets on failure', () => {
    const items = {
      'conversation-1': {
        conversationId: 'conversation-1',
        projectId: 'project-1',
        unreadCount: 2,
        hasUnreadMention: true,
      },
      'conversation-2': {
        conversationId: 'conversation-2',
        projectId: 'project-2',
        unreadCount: 1,
      },
    };
    const initialState = {
      ...reducer(undefined, { type: '@@INIT' }),
      inboxItemsByConversationId: items,
      inboxMeta: {
        unreadConversationTotal: 2,
        unreadMessageTotal: 3,
        unreadConversationTotalsByProjectId: { 'project-1': 1, 'project-2': 1 },
      },
    };
    const optimisticState = reducer(initialState, {
      type: ActionTypes.CHAT_INBOX_READ,
      payload: {
        conversationIds: ['conversation-1'],
        previousItemsByConversationId: { 'conversation-1': items['conversation-1'] },
      },
    });
    const concurrentState = reducer(optimisticState, {
      type: ActionTypes.CHAT_INBOX_ITEM_UPDATE_HANDLE,
      payload: { item: { id: 'conversation-2', unreadCount: 3 } },
    });
    const error = new Error('offline');
    const restoredState = reducer(concurrentState, {
      type: ActionTypes.CHAT_INBOX_READ__FAILURE,
      payload: {
        previousItemsByConversationId: { 'conversation-1': items['conversation-1'] },
        error,
      },
    });

    expect(restoredState.inboxItemsByConversationId['conversation-1']).toMatchObject(
      items['conversation-1'],
    );
    expect(restoredState.inboxItemsByConversationId['conversation-2'].unreadCount).toBe(3);
    expect(restoredState.inboxMeta).toMatchObject({
      unreadConversationTotal: 2,
      unreadMessageTotal: 5,
    });
    expect(restoredState.inboxError).toBe(error);
  });

  test('clears a conversation creation failure when the operation is retried', () => {
    const requestKey = 'project-1:direct:user-2';
    const error = { message: 'network error' };
    const failedState = reducer(undefined, {
      type: ActionTypes.CHAT_CONVERSATION_CREATE__FAILURE,
      payload: { projectId: 'project-1', requestKey, error },
    });

    expect(failedState.conversationCreationErrorsByKey[requestKey]).toBe(error);

    const retriedState = reducer(failedState, {
      type: ActionTypes.CHAT_CONVERSATION_CREATE,
      payload: { projectId: 'project-1', requestKey },
    });

    expect(retriedState.conversationCreationErrorsByKey[requestKey]).toBeUndefined();
  });

  test('correlates a created conversation with the originating request', () => {
    const requestKey = 'project-1:group:123';
    const state = reducer(undefined, {
      type: ActionTypes.CHAT_CONVERSATION_CREATE__SUCCESS,
      payload: {
        requestKey,
        conversation: { id: 'conversation-7' },
      },
    });

    expect(state.createdConversationIdByRequestKey[requestKey]).toBe('conversation-7');
  });

  test('stores the latest chat alert without its message content', () => {
    const state = reducer(undefined, {
      type: ActionTypes.CHAT_MESSAGE_ALERT_HANDLE,
      payload: {
        alert: {
          conversationId: 'conversation-1',
          messageId: 'message-1',
          projectId: 'project-1',
          hasMention: true,
        },
      },
    });

    expect(state.lastMessageAlert).toMatchObject({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      projectId: 'project-1',
      hasMention: true,
    });
    expect(state.lastMessageAlert.text).toBeUndefined();
  });

  test('purges revoked conversations from window and pagination state', () => {
    const state = {
      ...reducer(undefined, { type: '@@INIT' }),
      memberIdsByProject: { 'project-1': ['user-1'] },
      isMembersFetchingByProject: { 'project-1': true, 'project-2': true },
      isConversationsFetchingByProject: { 'project-1': true },
      hasFetchedConversationsByProject: { 'project-1': true },
      openConversationIds: ['conversation-1', 'conversation-2'],
      minimizedConversationIds: ['conversation-1'],
      isMessagesFetchingByConversation: {
        'conversation-1': true,
        'conversation-2': false,
      },
      hasMoreMessagesByConversation: {
        'conversation-1': true,
        'conversation-2': true,
      },
      errorsByScope: {
        'members:project-1': new Error('members'),
        'messages:conversation-1': new Error('messages'),
        'members:project-2': new Error('other project'),
      },
      conversationCreationErrorsByKey: {
        'project-1:direct:user-2': new Error('create'),
        'project-2:direct:user-2': new Error('other project'),
      },
      lastMessageAlert: { projectId: 'project-1', messageId: 'message-1' },
    };

    const nextState = reducer(state, {
      type: ActionTypes.CHAT_PROJECT_ACCESS_REVOKE_HANDLE,
      payload: { projectId: 'project-1', conversationIds: ['conversation-1'] },
    });

    expect(nextState.memberIdsByProject['project-1']).toEqual([]);
    expect(nextState.openConversationIds).toEqual(['conversation-2']);
    expect(nextState.minimizedConversationIds).toEqual([]);
    expect(nextState.isMessagesFetchingByConversation).toEqual({ 'conversation-2': false });
    expect(nextState.hasMoreMessagesByConversation).toEqual({ 'conversation-2': true });
    expect(nextState.isMembersFetchingByProject).toEqual({ 'project-2': true });
    expect(nextState.isConversationsFetchingByProject).toEqual({});
    expect(nextState.hasFetchedConversationsByProject).toEqual({});
    expect(nextState.errorsByScope).toEqual({
      'members:project-2': state.errorsByScope['members:project-2'],
    });
    expect(nextState.conversationCreationErrorsByKey).toEqual({
      'project-2:direct:user-2': state.conversationCreationErrorsByKey['project-2:direct:user-2'],
    });
    expect(nextState.lastMessageAlert).toBeNull();
    expect(nextState.accessRevocationVersionByProject['project-1']).toBe(1);
  });

  test('only marks conversations as fetched after a successful response', () => {
    const failureState = reducer(undefined, {
      type: ActionTypes.CHAT_CONVERSATIONS_FETCH__FAILURE,
      payload: { projectId: 'project-1', error: new Error('offline') },
    });

    expect(failureState.hasFetchedConversationsByProject['project-1']).toBeUndefined();

    const successState = reducer(failureState, {
      type: ActionTypes.CHAT_CONVERSATIONS_FETCH__SUCCESS,
      payload: { projectId: 'project-1' },
    });

    expect(successState.hasFetchedConversationsByProject['project-1']).toBe(true);
  });

  test('keeps independent drafts and reply targets for each conversation', () => {
    let state = reducer(undefined, {
      type: ActionTypes.CHAT_DRAFT_UPDATE,
      payload: { conversationId: 'conversation-1', text: 'first draft' },
    });
    state = reducer(state, {
      type: ActionTypes.CHAT_REPLY_TARGET_SET,
      payload: { conversationId: 'conversation-2', message: { id: 'message-4' } },
    });

    expect(state.draftsByConversation['conversation-1']).toBe('first draft');
    expect(state.replyTargetsByConversation['conversation-2']).toEqual({ id: 'message-4' });
  });

  test('does not let an expired typing timer clear a newer typing event', () => {
    let state = reducer(undefined, {
      type: ActionTypes.CHAT_TYPING_UPDATE_HANDLE,
      payload: {
        typingState: {
          conversationId: 'conversation-1',
          userId: 'user-2',
          isTyping: true,
          receivedAt: 100,
        },
      },
    });
    state = reducer(state, {
      type: ActionTypes.CHAT_TYPING_UPDATE_HANDLE,
      payload: {
        typingState: {
          conversationId: 'conversation-1',
          userId: 'user-2',
          isTyping: true,
          receivedAt: 200,
        },
      },
    });
    state = reducer(state, {
      type: ActionTypes.CHAT_TYPING_UPDATE_HANDLE,
      payload: {
        typingState: {
          conversationId: 'conversation-1',
          userId: 'user-2',
          isTyping: false,
          receivedAt: 100,
        },
      },
    });

    expect(state.typingByConversation['conversation-1']['user-2']).toBe(200);
  });

  test('paginates newer messages without overwriting the older-message cursor', () => {
    const state = {
      ...reducer(undefined, { type: '@@INIT' }),
      hasMoreMessagesByConversation: { 'conversation-1': true },
      hasMoreNewerMessagesByConversation: { 'conversation-1': true },
    };
    const nextState = reducer(state, {
      type: ActionTypes.CHAT_MESSAGES_FETCH__SUCCESS,
      payload: {
        conversationId: 'conversation-1',
        direction: 'after',
        hasMore: false,
        hasMoreAfter: false,
      },
    });

    expect(nextState.hasMoreMessagesByConversation['conversation-1']).toBe(true);
    expect(nextState.hasMoreNewerMessagesByConversation['conversation-1']).toBe(false);
  });
});
