import { call, put, select } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import selectors from '../../../selectors';
import request from '../request';
import { playChatMessageSound } from '../../../utils/chat-message-sound';
import {
  fetchChatInbox,
  handleChatConversationUpdate,
  handleChatMessageCreate,
  markChatConversationAsRead,
} from './chat';

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
    };
    expect(generator.next(body).value).toEqual(
      put(actions.fetchChatInbox.success(body.items, body.meta, body.included.users, options)),
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
      put(actions.fetchChatInbox.success([], body.meta, [], actionOptions)),
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

  test('plays a sound for a received message in an unopened conversation', () => {
    const message = { id: 'message-1', conversationId: 'conversation-1', userId: 'other-user' };
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
    const message = { id: 'message-1', conversationId: 'conversation-1', userId: 'current-user' };
    const generator = handleChatMessageCreate(message, []);

    generator.next();
    generator.next({ id: message.conversationId });
    generator.next('current-user');
    generator.next([]);
    expect(generator.next([]).value).toEqual(put(actions.handleChatMessageCreate(message, [])));
  });
});
