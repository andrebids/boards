import { all, call, select } from 'redux-saga/effects';
import { runSaga } from 'redux-saga';

import selectors from '../../selectors';
import request, { requestConcurrent } from './request';

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

describe('queued request failures', () => {
  const getState = () => ({ auth: { accessToken: 'test-token' } });
  test('delivers a rejected request to its caller without an unhandled detached-task error', async () => {
    const failure = { code: 'E_NOT_FOUND', message: 'Conversation not found' };
    const method = jest.fn().mockRejectedValue(failure);
    const onError = jest.fn();
    let caught;
    await runSaga({ getState, onError }, function* caller() {
      try {
        yield call(request, method, 'conversation-1');
      } catch (error) {
        caught = error;
      }
    }).toPromise();
    expect(caught).toBe(failure);
    expect(onError).not.toHaveBeenCalled();
    expect(method).toHaveBeenCalledWith('conversation-1', { Authorization: 'Bearer test-token' });
  });

  test('preserves ordering and lets the next queued request complete after a failure', async () => {
    const failure = new Error('rejected');
    let rejectFirst;
    const firstResponse = new Promise((resolve, reject) => {
      rejectFirst = reject;
    });
    const first = jest.fn(() => firstResponse);
    const second = jest
      .fn()
      .mockResolvedValue({ item: 'next response', error: 'valid payload field' });
    const onError = jest.fn();
    const task = runSaga({ getState, onError }, function* callers() {
      return yield all([
        call(function* firstCaller() {
          try {
            return yield call(request, first);
          } catch (error) {
            return error;
          }
        }),
        call(request, second),
      ]);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    rejectFirst(failure);
    expect(await task.toPromise()).toEqual([
      failure,
      { item: 'next response', error: 'valid payload field' },
    ]);
    expect(second).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('still reports genuinely unhandled caller failures', async () => {
    const failure = new Error('unexpected failure');
    const onError = jest.fn();
    const task = runSaga({ getState, onError }, function* caller() {
      yield call(request, jest.fn().mockRejectedValue(failure));
    });
    await expect(task.toPromise()).rejects.toBe(failure);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBe(failure);
  });
});
