import { getGlobalConversationTarget } from './navigation';

describe('getGlobalConversationTarget', () => {
  test('keeps the current route when opening a conversation from the current project', () => {
    expect(
      getGlobalConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '?cardModal=details',
        firstBoardId: 'first-board',
        item: {
          conversationId: 'general-conversation',
          firstUnreadMessageId: 'first-unread-message',
          projectId: 'current-project',
        },
      }),
    ).toEqual({
      conversationId: 'general-conversation',
      isCurrentProject: true,
      path: '/boards/current-board?cardModal=details&chatConversation=general-conversation&chatMessage=first-unread-message',
    });
  });

  test('routes directly to the first board when opening another project conversation', () => {
    expect(
      getGlobalConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '?cardModal=details',
        firstBoardId: 'target-board',
        item: {
          conversationId: 'general-conversation',
          projectId: 'target-project',
        },
      }),
    ).toEqual({
      conversationId: 'general-conversation',
      isCurrentProject: false,
      path: '/boards/target-board?chatConversation=general-conversation',
    });
  });

  test('falls back to the project route when the target project has no board', () => {
    expect(
      getGlobalConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '',
        firstBoardId: undefined,
        item: {
          conversationId: 'general-conversation',
          projectId: 'empty-project',
        },
      }),
    ).toEqual({
      conversationId: 'general-conversation',
      isCurrentProject: false,
      path: '/projects/empty-project?chatConversation=general-conversation',
    });
  });

  test('ignores incomplete inbox items', () => {
    expect(
      getGlobalConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '',
        firstBoardId: undefined,
        item: {
          projectId: 'current-project',
        },
      }),
    ).toBeNull();
  });
});
