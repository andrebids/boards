/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socketIOClient from 'socket.io-client';
import sailsIOClient from 'sails.io.js';

import Config from '../constants/Config';

const io = sailsIOClient(socketIOClient);
const REQUEST_TIMEOUT = 30000;

io.sails.url = Config.SERVER_BASE_URL;
io.sails.autoConnect = false;
io.sails.reconnection = true;
io.sails.useCORSRouteToGetCookie = false;
io.sails.environment = import.meta.env.MODE;

const { socket } = io;

socket.connect = socket._connect; // eslint-disable-line no-underscore-dangle

['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
  socket[method.toLowerCase()] = (url, data, headers) =>
    new Promise((resolve, reject) => {
      if (!socket.isConnected()) {
        const error = new Error(`Socket is disconnected: ${method} ${url}`);
        error.code = 'E_SOCKET_DISCONNECTED';
        reject(error);
        return;
      }

      let isSettled = false;
      const timeoutId = window.setTimeout(() => {
        isSettled = true;

        const error = new Error(`Socket request timed out: ${method} ${url}`);
        error.code = 'E_REQUEST_TIMEOUT';
        reject(error);
      }, REQUEST_TIMEOUT);

      socket.request(
        {
          method,
          data,
          headers,
          url: `/api${url}`,
        },
        (responseBody, { body, error } = {}) => {
          if (isSettled) {
            return;
          }

          isSettled = true;
          window.clearTimeout(timeoutId);

          if (responseBody instanceof Error) {
            reject(responseBody);
          } else if (error) {
            reject(body);
          } else {
            resolve(body ?? responseBody);
          }
        },
      );
    });
});

export default socket;
