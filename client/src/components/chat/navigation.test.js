import {
  activateGlobalTarget,
  getGlobalConversationTarget,
  getGlobalDirectConversationTarget,
} from './navigation';

describe('activateGlobalTarget', () => {
  test('does nothing when the target is invalid', () => {
    const navigate = jest.fn();
    const openCurrent = jest.fn();

    activateGlobalTarget(null, navigate, openCurrent);

    expect(navigate).not.toHaveBeenCalled();
    expect(openCurrent).not.toHaveBeenCalled();
  });

  test('navigates and opens immediately inside the current project', () => {
    const navigate = jest.fn();
    const openCurrent = jest.fn();

    activateGlobalTarget(
      { isCurrentProject: true, path: '/boards/current?chatDirectUser=user-2' },
      navigate,
      openCurrent,
    );

    expect(navigate).toHaveBeenCalledWith('/boards/current?chatDirectUser=user-2');
    expect(openCurrent).toHaveBeenCalledTimes(1);
  });

  test('only navigates when the target belongs to another project', () => {
    const navigate = jest.fn();
    const openCurrent = jest.fn();

    activateGlobalTarget(
      { isCurrentProject: false, path: '/boards/other?chatDirectUser=user-2' },
      navigate,
      openCurrent,
    );

    expect(navigate).toHaveBeenCalledWith('/boards/other?chatDirectUser=user-2');
    expect(openCurrent).not.toHaveBeenCalled();
  });
});

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

  test('adds a one-time reply intent when opening from a notification action', () => {
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
          reply: true,
        },
      }),
    ).toEqual({
      conversationId: 'general-conversation',
      isCurrentProject: true,
      path: '/boards/current-board?cardModal=details&chatConversation=general-conversation&chatMessage=first-unread-message&reply=1',
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

describe('getGlobalDirectConversationTarget', () => {
  test('routes to a shared project and creates a one-time direct-chat intent', () => {
    expect(
      getGlobalDirectConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '?cardModal=details',
        firstBoardId: 'target-board',
        person: { projectId: 'target-project', userId: 'user-2' },
      }),
    ).toEqual({
      isCurrentProject: false,
      path: '/boards/target-board?chatDirectUser=user-2',
    });
  });

  test('keeps the current route without leaving a consumed direct-chat intent', () => {
    expect(
      getGlobalDirectConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '?cardModal=details&chatConversation=conversation-1',
        person: { projectId: 'current-project', userId: 'user-2' },
      }),
    ).toEqual({
      isCurrentProject: true,
      path: '/boards/current-board?cardModal=details',
    });
  });

  test('does not leave an empty query string after clearing chat parameters', () => {
    expect(
      getGlobalDirectConversationTarget({
        currentPathname: '/boards/current-board',
        currentProjectId: 'current-project',
        currentSearch: '?chatConversation=conversation-1',
        person: { projectId: 'current-project', userId: 'user-2' },
      }),
    ).toEqual({
      isCurrentProject: true,
      path: '/boards/current-board',
    });
  });
});
