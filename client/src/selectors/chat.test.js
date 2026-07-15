import {
  selectChatInboxItems,
  selectChatInboxUnreadConversationTotal,
  selectChatInboxUnreadMessageTotal,
  selectChatInboxUnreadTotalsByProjectId,
  selectIsChatAvailableForCurrentUser,
} from './chat';

jest.mock('../constants/Config', () => ({
  __esModule: true,
  default: {
    ACTIVITIES_LIMIT: 10,
    CARDS_LIMIT: 50,
    COMMENTS_LIMIT: 50,
    POSITION_GAP: 65536,
  },
}));
jest.mock('../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));

const makeState = (chat) => ({ chat });

describe('chat inbox selectors', () => {
  test('sorts summaries by recent activity and uses authoritative totals', () => {
    const state = makeState({
      inboxItemsByConversationId: {
        older: {
          conversationId: 'older',
          projectId: 'project-1',
          unreadCount: 5,
          lastMessageAt: new Date('2026-07-15T10:00:00.000Z'),
        },
        newer: {
          conversationId: 'newer',
          projectId: 'project-2',
          unreadCount: 0,
          lastMessageAt: new Date('2026-07-15T12:00:00.000Z'),
        },
      },
      inboxMeta: {
        hasChatAccess: true,
        unreadConversationTotal: 7,
        unreadMessageTotal: 20,
        unreadConversationTotalsByProjectId: { 'project-1': 4, 'project-2': 3 },
      },
    });

    expect(selectChatInboxItems(state).map(({ conversationId }) => conversationId)).toEqual([
      'newer',
      'older',
    ]);
    expect(selectChatInboxUnreadConversationTotal(state)).toBe(7);
    expect(selectChatInboxUnreadMessageTotal(state)).toBe(20);
    expect(selectChatInboxUnreadTotalsByProjectId(state)).toEqual({
      'project-1': 4,
      'project-2': 3,
    });
    expect(selectIsChatAvailableForCurrentUser(state)).toBe(true);
  });

  test('derives totals and availability when metadata is absent', () => {
    const state = makeState({
      inboxItemsByConversationId: {
        first: { conversationId: 'first', projectId: 'project-1', unreadCount: 2 },
        second: { conversationId: 'second', projectId: 'project-1', unreadCount: 0 },
      },
      inboxMeta: {},
    });

    expect(selectChatInboxUnreadConversationTotal(state)).toBe(1);
    expect(selectChatInboxUnreadMessageTotal(state)).toBe(2);
    expect(selectChatInboxUnreadTotalsByProjectId(state)).toEqual({ 'project-1': 1 });
    expect(selectIsChatAvailableForCurrentUser(state)).toBe(true);
  });
});
