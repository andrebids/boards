/*! Copyright (c) 2024 PLANKA Software GmbH */

import socket from './socket';

const createWebPushSubscription = (data, headers) =>
  socket.post('/web-push-subscriptions', data, headers);

const deleteCurrentWebPushSubscription = (endpoint, headers) =>
  socket.delete('/web-push-subscriptions/current', { endpoint }, headers);

export default {
  createWebPushSubscription,
  deleteCurrentWebPushSubscription,
};
