import { call, put, select } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import selectors from '../../../selectors';
import { createLocalId } from '../../../utils/local-id';
import request from '../request';
import { deleteCard, updateCard } from './cards';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    deleteCard: jest.fn(),
    updateCard: jest.fn(),
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
jest.mock('./router', () => ({
  goToBoard: jest.fn(),
  goToCard: jest.fn(),
}));
jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

describe('card service rollback data', () => {
  test('forwards the pre-update snapshot when an update fails', () => {
    const data = { name: 'Changed' };
    const rollbackData = { card: { id: 'card-1', name: 'Original' } };
    const operationId = 'operation-1';
    const error = new Error('network');
    const generator = updateCard('card-1', data);

    expect(generator.next().value).toEqual(select(selectors.selectCardRollbackDataById, 'card-1'));
    expect(generator.next(rollbackData).value).toEqual(call(createLocalId));
    expect(generator.next(operationId).value).toEqual(
      put(actions.updateCard('card-1', data, operationId, rollbackData)),
    );
    expect(generator.next().value).toEqual(call(request, api.updateCard, 'card-1', data));
    expect(generator.throw(error).value).toEqual(
      put(actions.updateCard.failure('card-1', error, rollbackData, operationId)),
    );
    expect(generator.next().done).toBe(true);
  });

  test('forwards the pre-delete snapshot when a delete fails', () => {
    const rollbackData = { card: { id: 'card-1' } };
    const operationId = 'operation-1';
    const error = new Error('network');
    const generator = deleteCard('card-1');

    expect(generator.next().value).toEqual(select(selectors.selectPath));
    expect(generator.next({ cardId: 'another-card', boardId: 'board-1' }).value).toEqual(
      select(selectors.selectCardRollbackDataById, 'card-1'),
    );
    expect(generator.next(rollbackData).value).toEqual(call(createLocalId));
    expect(generator.next(operationId).value).toEqual(
      put(actions.deleteCard('card-1', operationId, rollbackData)),
    );
    expect(generator.next().value).toEqual(call(request, api.deleteCard, 'card-1'));
    expect(generator.throw(error).value).toEqual(
      put(actions.deleteCard.failure('card-1', error, rollbackData, operationId)),
    );
    expect(generator.next().done).toBe(true);
  });
});
