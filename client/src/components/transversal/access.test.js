import { canUseTransversal, isAccessError } from './access';

test('only shows the tab for the selected current user or all members', () => {
  expect(canUseTransversal(undefined, '2')).toBe(false);
  expect(canUseTransversal({ transversalMode: 'all' }, undefined)).toBe(false);
  expect(canUseTransversal({ transversalMode: 'disabled' }, '2')).toBe(false);
  expect(canUseTransversal({ transversalMode: 'selected', transversalUserIds: [] }, '2')).toBe(
    false,
  );
  expect(canUseTransversal({ transversalMode: 'selected', transversalUserIds: ['3'] }, '2')).toBe(
    false,
  );
  expect(canUseTransversal({ transversalMode: 'selected', transversalUserIds: ['2'] }, '2')).toBe(
    true,
  );
  expect(canUseTransversal({ transversalMode: 'all' }, '2')).toBe(true);
});

test('clears results on lost access while keeping network errors retryable', () => {
  expect(isAccessError({ code: 'E_NOT_FOUND' })).toBe(true);
  expect(isAccessError({ statusCode: 403 })).toBe(true);
  expect(isAccessError({ code: 'E_REQUEST_TIMEOUT' })).toBe(false);
});
