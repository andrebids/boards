import { call, delay, put } from 'redux-saga/effects';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';
import { handleCardCreate } from './cards';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    getCard: jest.fn(),
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
jest.mock('../../../lib/redux-router', () => ({
  LOCATION_CHANGE_HANDLE: 'LOCATION_CHANGE_HANDLE',
}));
jest.mock('nanoid', () => ({ nanoid: jest.fn() }));
jest.mock('./router', () => ({
  goToBoard: jest.fn(),
  goToCard: jest.fn(),
}));

describe('handleCardCreate', () => {
  const socketCard = {
    id: 'card-1',
    boardId: 'board-1',
    listId: 'list-1',
    name: 'Socket card',
  };

  const included = {
    users: [{ id: 'user-1' }],
    cardMemberships: [],
    cardLabels: [],
    taskLists: [],
    tasks: [],
    attachments: [],
    customFieldGroups: [],
    customFields: [],
    customFieldValues: [],
  };

  test('retries transient detail failures and handles the card once', () => {
    const fetchedCard = { ...socketCard, name: 'Fetched card' };
    const generator = handleCardCreate(socketCard);

    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.throw(new Error('not ready')).value).toEqual(delay(250));
    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.throw(new Error('network')).value).toEqual(delay(500));
    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.next({ item: fetchedCard, included }).value).toEqual(
      put(
        actions.handleCardCreate(
          fetchedCard,
          included.users,
          included.cardMemberships,
          included.cardLabels,
          included.taskLists,
          included.tasks,
          included.attachments,
          included.customFieldGroups,
          included.customFields,
          included.customFieldValues,
        ),
      ),
    );
    expect(generator.next().done).toBe(true);
  });

  test('falls back to the socket card after the bounded retries', () => {
    const generator = handleCardCreate(socketCard);

    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.throw(new Error('first')).value).toEqual(delay(250));
    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.throw(new Error('second')).value).toEqual(delay(500));
    expect(generator.next().value).toEqual(call(request, api.getCard, socketCard.id));
    expect(generator.throw(new Error('third')).value).toEqual(
      put(actions.handleCardCreate(socketCard, [], [], [], [], [], [], [], [], [], [])),
    );
    expect(generator.next().done).toBe(true);
  });
});
