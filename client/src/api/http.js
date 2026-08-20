/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';

const http = {};
const REQUEST_TIMEOUT = 120000;

const createResponseError = (body, statusCode) => {
  const error = new Error('HTTP request failed');
  if (body && typeof body === 'object') {
    Object.assign(error, body);
  }
  error.code = error.code || `E_HTTP_${statusCode}`;
  error.statusCode = statusCode;
  return error;
};

export const normalizeHttpError = (error) => {
  if (error.name === 'AbortError') {
    const timeoutError = new Error('HTTP network request failed');
    timeoutError.code = 'E_HTTP_TIMEOUT';
    timeoutError.name = error.name;
    return timeoutError;
  }

  if (typeof error.code === 'string' || error.statusCode) {
    return error;
  }

  const networkError = new Error('HTTP network request failed');
  networkError.code = 'E_HTTP_NETWORK';
  networkError.name = error.name || networkError.name;
  return networkError;
};

// TODO: add all methods
['GET', 'POST', 'DELETE'].forEach((method) => {
  http[method.toLowerCase()] = (url, data, headers, options = {}) => {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(
      () => abortController.abort(),
      options.timeout || REQUEST_TIMEOUT,
    );
    const formData =
      data &&
      Object.keys(data).reduce((result, key) => {
        result.append(key, data[key]);

        return result;
      }, new FormData());

    return fetch(`${Config.SERVER_BASE_URL}/api${url}`, {
      method,
      headers,
      body: formData,
      credentials: 'include',
      signal: abortController.signal,
    })
      .then(async (response) => {
        let body;
        try {
          body = await response.json();
        } catch {
          const error = new Error('Invalid HTTP response');
          error.code = 'E_HTTP_INVALID_RESPONSE';
          error.statusCode = response.status;
          throw error;
        }

        if (!response.ok) {
          throw createResponseError(body, response.status);
        }
        return body;
      })
      .catch((error) => {
        throw normalizeHttpError(error);
      })
      .finally(() => window.clearTimeout(timeoutId));
  };
});

export default http;
