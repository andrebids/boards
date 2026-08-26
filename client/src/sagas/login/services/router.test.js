import { call, select } from 'redux-saga/effects';

import Paths from '../../../constants/Paths';
import selectors from '../../../selectors';
import { goTo, goToLogin, goToPostAuthenticationTarget, handleLocationChange } from './router';
import { consumeReturnTo, storeCurrentLocationForReturn } from './return-to';

jest.mock('../../../constants/Config', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../constants/StaticUsers', () => ({
  __esModule: true,
  STATIC_USER_BY_ID: {},
  StaticUserIds: { DELETED: null },
  default: { DELETED: { id: null, name: 'deletedUser' } },
}));
jest.mock('../../../lib/redux-router', () => ({
  push: jest.fn(),
}));
jest.mock('./login', () => ({
  authenticateWithOidc: jest.fn(),
  authenticateWithOidcCallback: jest.fn(),
}));
jest.mock('./return-to', () => ({
  consumeReturnTo: jest.fn(),
  storeCurrentLocationForReturn: jest.fn(),
}));

describe('login route guard', () => {
  test.each([Paths.DASHBOARD, Paths.GANTT])(
    'redirects an anonymous visitor from %s to the login page',
    (path) => {
      const generator = handleLocationChange();

      expect(generator.next().value).toEqual(select(selectors.selectPathsMatch));
      expect(generator.next({ pattern: { path } }).value).toEqual(
        call(storeCurrentLocationForReturn),
      );
      expect(generator.next().value).toEqual(call(goToLogin));
    },
  );

  test('returns to a safe stored route after authentication', () => {
    consumeReturnTo.mockReturnValue('/projects/123?chatConversation=456&reply=1');
    const generator = goToPostAuthenticationTarget();

    expect(generator.next().value).toEqual(call(consumeReturnTo));
    expect(generator.next('/projects/123?chatConversation=456&reply=1').value).toEqual(
      call(goTo, '/projects/123?chatConversation=456&reply=1'),
    );
  });
});
