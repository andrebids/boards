import { normalizeHttpError } from './http';

jest.mock('../constants/Config', () => ({
  __esModule: true,
  default: { SERVER_BASE_URL: '' },
}));

describe('HTTP error normalization', () => {
  test('turns a native abort into a stable timeout error', () => {
    const error = new DOMException('signal is aborted without reason', 'AbortError');

    const normalizedError = normalizeHttpError(error);

    expect(normalizedError).not.toBe(error);
    expect(normalizedError.code).toBe('E_HTTP_TIMEOUT');
    expect(normalizedError.message).toBe('HTTP network request failed');
  });

  test('preserves structured server errors', () => {
    const error = Object.assign(new Error('HTTP request failed'), {
      code: 'E_ATTACHMENT_TOO_LARGE',
      statusCode: 422,
    });

    expect(normalizeHttpError(error)).toBe(error);
  });

  test('does not mistake a native numeric code for an application error', () => {
    const error = Object.assign(new Error('network failed'), { code: 20, name: 'NetworkError' });

    const normalizedError = normalizeHttpError(error);

    expect(normalizedError.code).toBe('E_HTTP_NETWORK');
  });
});
