/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';

const requestPasswordReset = (email) => http.post('/password-reset-requests', { email });

const resetPassword = (token, password) =>
  http.post('/password-resets', {
    token,
    password,
  });

export default {
  requestPasswordReset,
  resetPassword,
};
