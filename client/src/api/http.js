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

// TODO: add all methods
['GET', 'POST', 'DELETE'].forEach((method) => {
  http[method.toLowerCase()] = (url, data, headers) => {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), REQUEST_TIMEOUT);
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
        if (error.code) {
          throw error;
        }

        const networkError = new Error('HTTP network request failed');
        networkError.code = error.name === 'AbortError' ? 'E_HTTP_TIMEOUT' : 'E_HTTP_NETWORK';
        networkError.name = error.name || networkError.name;
        throw networkError;
      })
      .finally(() => window.clearTimeout(timeoutId));
  };
});

export default http;
