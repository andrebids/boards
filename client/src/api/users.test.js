import http from './http';
import users from './users';

jest.mock('./http', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('./socket', () => ({ __esModule: true, default: {} }));

test('requests a password from the shared server generator with authentication', async () => {
  const response = { item: { password: 'generated-test-password' } };
  const headers = { Authorization: 'Bearer test-token' };
  http.post.mockResolvedValue(response);

  await expect(users.generateUserPassword(headers)).resolves.toEqual(response);
  expect(http.post).toHaveBeenCalledWith('/users/generate-password', undefined, headers);
});
