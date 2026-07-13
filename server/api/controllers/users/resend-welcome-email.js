/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
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
    notEnoughRights: {
      responseType: 'forbidden',
    },
    userNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let user = await User.qm.getOneById(inputs.id);
    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    if (
      user.isSsoUser ||
      user.email === sails.config.custom.defaultAdminEmail ||
      !User.WELCOME_EMAIL_LANGUAGES.includes(user.language)
    ) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const temporaryPassword = sails.helpers.users.generateTemporaryPassword();
    user = await sails.helpers.users.updateOne.with({
      values: {
        password: temporaryPassword,
        mustChangePassword: true,
        welcomeEmailSentAt: null,
      },
      record: user,
      actorUser: currentUser,
      request: this.req,
    });

    let welcomeEmailSent = false;
    try {
      await sails.helpers.users.sendWelcomeEmail.with({
        user,
        temporaryPassword,
      });

      const welcomeEmailSentAt = new Date().toISOString();
      user = await User.qm.updateOne(user.id, {
        welcomeEmailSentAt,
      });
      welcomeEmailSent = true;
    } catch (error) {
      sails.log.error(`Welcome email could not be resent for user ${user.id}: ${error.message}`);
    }

    return {
      item: sails.helpers.users.presentOne(user, currentUser),
      included: {
        welcomeEmailSent,
      },
    };
  },
};
