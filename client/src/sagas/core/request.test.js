import { call, select } from 'redux-saga/effects';

import selectors from '../../selectors';
import { requestConcurrent } from './request';

jest.mock('../../constants/Config', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));

describe('concurrent authenticated requests', () => {
  test('calls the method immediately with the current access token', () => {
    const method = jest.fn();
    const generator = requestConcurrent(method, 'message-1', { file: 'file-1' });

    expect(generator.next().value).toEqual(select(selectors.selectAccessToken));
    expect(generator.next('access-token').value).toEqual(
      call(method, 'message-1', { file: 'file-1' }, { Authorization: 'Bearer access-token' }),
    );
    expect(generator.next({ item: 'attachment-1' })).toEqual({
      done: true,
      value: { item: 'attachment-1' },
    });
  });
});
