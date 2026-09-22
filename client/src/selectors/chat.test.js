import {
  makeSelectChatConversationById,
  makeSelectChatTypingUserIdsByConversationId,
  selectChatInboxItems,
  selectChatInboxNotificationItems,
  selectChatInboxUnreadConversationTotal,
  selectChatInboxUnreadMessageTotal,
  selectChatInboxUnreadTotalsByProjectId,
  selectIsChatAvailableForCurrentUser,
} from './chat';
import orm from '../orm';

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

describe('typing selector stability', () => {
  test('reuses the result for unchanged typing state and updates when users start or stop', () => {
    const selectTyping = makeSelectChatTypingUserIdsByConversationId();
    const state = makeState({ typingByConversation: {} });
    const empty = selectTyping(state, 'group-1');
    expect(selectTyping(state, 'group-1')).toBe(empty);
    const started = makeState({ typingByConversation: { 'group-1': { 'user-1': 1 } } });
    const users = selectTyping(started, 'group-1');
    expect(users).toEqual(['user-1']);
    expect(selectTyping({ ...started, unrelated: true }, 'group-1')).toBe(users);
    expect(selectTyping(state, 'group-1')).toEqual([]);
  });
});

describe('chat inbox selectors', () => {
  test('keeps departure metadata without treating former members as active group members', () => {
    const session = orm.session(orm.getEmptyState());
    session.ChatConversation.create({ id: 'group-1', type: 'projectCustomGroup' });
    session.ChatParticipant.create({ id: 'active', conversationId: 'group-1', userId: 'user-1' });
    session.ChatParticipant.create({
      id: 'left',
      conversationId: 'group-1',
      userId: 'user-2',
      leftAt: '2026-09-21',
    });
    const conversation = makeSelectChatConversationById().resultFunc(session, 'group-1');
    expect(conversation.participantUserIds).toEqual(['user-1']);
    expect(conversation.participants).toHaveLength(2);
    expect(conversation.participants.find(({ userId }) => userId === 'user-2').leftAt).toBeTruthy();
  });

  test('selects the three most recent accessible conversations with unread messages', () => {
    const state = makeState({
      inboxItemsByConversationId: {
        oldest: {
          conversationId: 'oldest',
          hasChatAccess: true,
          lastMessageAt: '2026-07-15T09:00:00.000Z',
          unreadCount: 1,
        },
        second: {
          conversationId: 'second',
          hasChatAccess: true,
          lastMessageAt: '2026-07-15T11:00:00.000Z',
          unreadCount: 2,
        },
        newest: {
          conversationId: 'newest',
          hasChatAccess: true,
          lastMessageAt: '2026-07-15T12:00:00.000Z',
          unreadCount: 1,
        },
        third: {
          conversationId: 'third',
          hasChatAccess: true,
          lastMessageAt: '2026-07-15T10:00:00.000Z',
          unreadCount: 3,
        },
        read: {
          conversationId: 'read',
          hasChatAccess: true,
          lastMessageAt: '2026-07-15T13:00:00.000Z',
          unreadCount: 0,
        },
        unavailable: {
          conversationId: 'unavailable',
          hasChatAccess: false,
          lastMessageAt: '2026-07-15T14:00:00.000Z',
          unreadCount: 4,
        },
      },
      inboxMeta: {},
    });

    expect(
      selectChatInboxNotificationItems(state).map(({ conversationId }) => conversationId),
    ).toEqual(['newest', 'second', 'third']);
  });

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
