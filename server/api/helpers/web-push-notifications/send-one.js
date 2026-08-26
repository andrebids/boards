/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const webpush = require('web-push');

const { validateWebPushEndpoint } = require('../../../utils/web-push-subscription');
const { getSendOptions } = require('../../../utils/web-push-notifications');

module.exports = {
  inputs: {
    subscription: { type: 'ref', required: true },
    payload: { type: 'ref', required: true },
  },

  async fn(inputs) {
    const endpoint = await validateWebPushEndpoint(inputs.subscription.endpoint);
    return webpush.sendNotification(
      {
        endpoint,
        keys: {
          p256dh: inputs.subscription.p256dh,
          auth: inputs.subscription.auth,
        },
      },
      JSON.stringify(inputs.payload),
      getSendOptions(),
    );
  },
};
