import reducer from './chat';
import ActionTypes from '../constants/ActionTypes';

describe('chat reducer', () => {
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

  test('purges revoked conversations from window and pagination state', () => {
    const state = {
      ...reducer(undefined, { type: '@@INIT' }),
      memberIdsByProject: { 'project-1': ['user-1'] },
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
});
