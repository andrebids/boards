/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  EMAIL_ALREADY_IN_USE: {
    emailAlreadyInUse: 'Email already in use',
  },
  ACTIVE_LIMIT_REACHED: {
    activeLimitReached: 'Active limit reached',
  },
};

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      isEmail: true,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    language: {
      type: 'string',
      isIn: User.WELCOME_EMAIL_LANGUAGES,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    emailAlreadyInUse: {
      responseType: 'conflict',
    },
    activeLimitReached: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (sails.config.custom.oidcEnforced) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const temporaryPassword = sails.helpers.users.generateTemporaryPassword();
    const values = {
      ..._.pick(inputs, ['email', 'name', 'language']),
      password: temporaryPassword,
      role: User.Roles.BOARD_USER,
      username: null,
      mustChangePassword: true,
      welcomeEmailSentAt: null,
    };

    let user = await sails.helpers.users.createOne
      .with({
        values,
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('emailAlreadyInUse', () => Errors.EMAIL_ALREADY_IN_USE)
      .intercept('activeLimitReached', () => Errors.ACTIVE_LIMIT_REACHED);

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
      sails.log.error(`Welcome email could not be sent for user ${user.id}: ${error.message}`);
    }

    return {
      item: sails.helpers.users.presentOne(user, currentUser),
      included: {
        welcomeEmailSent,
      },
    };
  },
};
