import {
  getConversationTitle,
  getDirectUser,
  getParticipantUserIds,
  hasUnreadMessages,
  isDirectConversation,
  isGeneralConversation,
} from './utils';

const members = [
  { id: '1', name: 'Ana' },
  { id: '2', name: 'Bruno' },
];

const labels = {
  conversationTitle: 'Conversa',
  generalTitle: 'Geral',
};

describe('chat utils', () => {
  test('distinguishes a direct conversation from a custom group', () => {
    expect(isDirectConversation({ type: 'projectDirect' })).toBeTruthy();
    expect(isDirectConversation({ type: 'projectCustomGroup' })).toBeFalsy();
  });

  test('recognizes the project group conversation', () => {
    expect(isGeneralConversation({ type: 'projectGroup' })).toBeTruthy();
    expect(isGeneralConversation({ type: 'projectDirect' })).toBeFalsy();
  });

  test('recognizes unread conversations from their unread count', () => {
    expect(hasUnreadMessages()).toBeFalsy();
    expect(hasUnreadMessages({ unreadCount: 0 })).toBeFalsy();
    expect(hasUnreadMessages({ unreadCount: 1 })).toBeTruthy();
  });

  test('normalizes participant records to user ids', () => {
    expect(
      getParticipantUserIds({
        participants: [{ userId: '1' }, { userId: '2' }],
      }),
    ).toEqual(['1', '2']);
  });

  test('resolves the other participant in a direct conversation', () => {
    const conversation = {
      type: 'projectDirect',
      participantUserIds: ['1', '2'],
    };

    expect(getDirectUser(conversation, members, '1')).toEqual(members[1]);
    expect(getConversationTitle(conversation, members, '1', 'Projeto', labels)).toBe('Bruno');
  });

  test('resolves a former project member included with the conversation', () => {
    const formerMember = { id: '3', name: 'Carla' };
    const conversation = {
      type: 'projectDirect',
      participantUserIds: ['1', '3'],
      participantUsers: [members[0], formerMember],
    };

    expect(getDirectUser(conversation, members, '1')).toEqual(formerMember);
    expect(getConversationTitle(conversation, members, '1', 'Projeto', labels)).toBe('Carla');
  });

  test('uses the project name for the general conversation title', () => {
    expect(getConversationTitle({ type: 'projectGroup' }, members, '1', 'Lançamento', labels)).toBe(
      'Geral — Lançamento',
    );
  });
});
