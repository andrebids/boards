/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOTIFICATION_SERVICE_NOT_FOUND: {
    notificationServiceNotFound: 'Notification service not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notificationServiceNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const {
      notificationService,
      user,
      project,
    } = await sails.helpers.notificationServices.getPathToUserById
      .with({
        id: inputs.id,
      })
      .intercept('pathNotFound', () => Errors.NOTIFICATION_SERVICE_NOT_FOUND);

    console.log(`--- [test.js controller] Received test request for notification service ID: ${notificationService.id} ---`);

    if (notificationService.userId) {
      if (user.id !== currentUser.id) {
        throw Errors.NOTIFICATION_SERVICE_NOT_FOUND; // Forbidden
      }
    } else if (notificationService.boardId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        throw Errors.NOTIFICATION_SERVICE_NOT_FOUND; // Forbidden
      }
    }

    const t = sails.helpers.utils.makeTranslator(currentUser.language);

    await sails.helpers.notificationServices.testOne
      .with({
        record: notificationService,
        i18n: t,
      })
      .intercept('badRequest', (error) => error);

    return {
      item: notificationService,
    };
  },
};
