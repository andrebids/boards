/*! Copyright (c) 2024 PLANKA Software GmbH */

const { selectWebPushSubscriptionsToPrune } = require('../../../utils/web-push-subscription');

module.exports = {
  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
    subscription: {
      type: 'ref',
      required: true,
    },
  },

  exits: {
    endpointOwnedByAnotherUser: {},
  },

  async fn(inputs) {
    return sails.getDatastore().transaction(async (db) => {
      const existing = await WebPushSubscription.qm.getOneByEndpoint(
        inputs.subscription.endpoint,
        db,
      );
      const values = {
        p256dh: inputs.subscription.keys.p256dh,
        auth: inputs.subscription.keys.auth,
        expirationTime: inputs.subscription.expirationTime,
      };

      if (existing) {
        if (String(existing.userId) !== String(inputs.user.id)) {
          throw 'endpointOwnedByAnotherUser';
        }

        return WebPushSubscription.qm.updateOne(existing.id, values, db);
      }

      let subscription;
      try {
        subscription = await WebPushSubscription.qm.createOne(
          {
            ...values,
            endpoint: inputs.subscription.endpoint,
            userId: inputs.user.id,
          },
          db,
        );
      } catch (error) {
        if (error.code === 'E_UNIQUE') {
          throw 'endpointOwnedByAnotherUser';
        }
        throw error;
      }

      const subscriptions = await WebPushSubscription.qm.getByUserId(inputs.user.id, db);
      const subscriptionsToPrune = selectWebPushSubscriptionsToPrune(subscriptions);
      if (subscriptionsToPrune.length > 0) {
        await WebPushSubscription.qm.delete(
          subscriptionsToPrune.map(({ id }) => id),
          db,
        );
      }

      return subscription;
    });
  },
};
