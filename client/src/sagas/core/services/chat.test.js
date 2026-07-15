import { call, put, select } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import selectors from '../../../selectors';
import request from '../request';
import { fetchChatInbox, handleChatConversationUpdate, markChatConversationAsRead } from './chat';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    getChatInbox: jest.fn(),
    markChatConversationAsRead: jest.fn(),
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
jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

describe('chat inbox services', () => {
  test('fetches inbox summaries together with included users', () => {
    const generator = fetchChatInbox();
    expect(generator.next().value).toEqual(put(actions.fetchChatInbox()));
    expect(generator.next().value).toEqual(call(request, api.getChatInbox));

    const body = {
      items: [{ conversationId: 'conversation-1' }],
      meta: { hasChatAccess: true },
      included: { users: [{ id: 'user-2' }] },
    };
    expect(generator.next(body).value).toEqual(
      put(actions.fetchChatInbox.success(body.items, body.meta, body.included.users)),
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
      generator.next({ inboxItemsByConversationId: { [conversationId]: inboxItem } }).value,
    ).toEqual(put(actions.markChatConversationAsRead(conversationId, inboxItem)));
    expect(generator.next().value).toEqual(
      call(request, api.markChatConversationAsRead, conversationId, {}),
    );
    expect(generator.next({ item: readState }).value).toEqual(
      select(selectors.selectChatConversationById, conversationId),
    );
    expect(generator.next(undefined).value).toEqual(select(selectors.selectChatState));
    expect(
      generator.next({ inboxItemsByConversationId: { [conversationId]: inboxItem } }).value,
    ).toEqual(put(actions.markChatConversationAsRead.success(readState)));
    expect(generator.next().done).toBe(true);
  });
});
