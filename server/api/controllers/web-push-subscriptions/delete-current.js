/*! Copyright (c) 2024 PLANKA Software GmbH */

const { validateWebPushEndpoint } = require('../../../utils/web-push-subscription');

const Errors = {
  FEATURE_DISABLED: { featureDisabled: 'Web Push is disabled' },
  INVALID_SUBSCRIPTION: {
    invalidSubscription: 'Invalid Web Push subscription',
  },
};

module.exports = {
  inputs: {
    endpoint: {
      type: 'string',
      required: true,
      maxLength: 2048,
    },
  },

  exits: {
    featureDisabled: { responseType: 'notFound' },
    invalidSubscription: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    if (!sails.config.custom.webPush.enabled) {
      throw Errors.FEATURE_DISABLED;
    }

    let endpoint;
    try {
      endpoint = await validateWebPushEndpoint(inputs.endpoint, {
        resolveDns: false,
      });
    } catch (_error) {
      throw Errors.INVALID_SUBSCRIPTION;
    }

    const item = await WebPushSubscription.qm.deleteOne({
      endpoint,
      userId: this.req.currentUser.id,
    });
    return {
      item: item ? sails.helpers.webPushSubscriptions.presentOne(item) : null,
    };
  },
};
