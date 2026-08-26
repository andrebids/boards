/*! Copyright (c) 2024 PLANKA Software GmbH */

const { validateWebPushSubscription } = require('../../../utils/web-push-subscription');

const Errors = {
  FEATURE_DISABLED: { featureDisabled: 'Web Push is disabled' },
  INVALID_SUBSCRIPTION: {
    invalidSubscription: 'Invalid Web Push subscription',
  },
  ENDPOINT_OWNED_BY_ANOTHER_USER: {
    endpointOwnedByAnotherUser: 'Web Push subscription belongs to another user',
  },
};

module.exports = {
  inputs: {
    endpoint: {
      type: 'string',
      required: true,
      maxLength: 2048,
    },
    keys: {
      type: 'json',
      required: true,
    },
    expirationTime: {
      type: 'number',
      allowNull: true,
    },
  },

  exits: {
    featureDisabled: { responseType: 'notFound' },
    invalidSubscription: { responseType: 'unprocessableEntity' },
    endpointOwnedByAnotherUser: { responseType: 'conflict' },
  },

  async fn(inputs) {
    if (!sails.config.custom.webPush.enabled) {
      throw Errors.FEATURE_DISABLED;
    }

    let subscription;
    try {
      subscription = await validateWebPushSubscription(inputs);
    } catch (_error) {
      throw Errors.INVALID_SUBSCRIPTION;
    }

    const item = await sails.helpers.webPushSubscriptions
      .upsertOne({
        user: this.req.currentUser,
        subscription,
      })
      .intercept('endpointOwnedByAnotherUser', () => Errors.ENDPOINT_OWNED_BY_ANOTHER_USER);

    return {
      item: sails.helpers.webPushSubscriptions.presentOne(item),
    };
  },
};
