const { expect } = require('chai');
const lodash = require('lodash');

describe('users/create', () => {
  const originalSails = global.sails;
  const originalUser = global.User;
  const originalLodash = global._;
  let createUser;

  before(() => {
    global._ = lodash;
    global.User = {
      EMAIL_LANGUAGES: ['fr-FR'],
      Roles: {
        BOARD_USER: 'boardUser',
      },
      findOne: async () => null,
      qm: {
        updateOne: async () => ({ id: 'user-id' }),
      },
    };
    global.sails = {
      config: {
        custom: {
          oidcEnforced: false,
        },
      },
      helpers: {
        users: {
          generateTemporaryPassword: () => 'temporary-password',
          generateUsername: {
            with: ({ name, suffix }) => {
              expect(name).to.equal('Manon Godebout');
              expect(suffix).to.equal(0);

              return 'manon.godebout';
            },
          },
          createOne: {
            with: ({ values }) => {
              expect(values.username).to.equal('manon.godebout');

              return {
                intercept: () => ({
                  intercept: async () => ({ id: 'user-id', username: values.username }),
                }),
              };
            },
          },
          sendWelcomeEmail: {
            with: async () => {},
          },
          presentOne: (user) => user,
        },
      },
    };
    // eslint-disable-next-line global-require
    createUser = require('../../../../api/controllers/users/create');
  });

  after(() => {
    global.sails = originalSails;
    global.User = originalUser;
    global._ = originalLodash;
  });

  it('generates the username through the helper machine contract', async () => {
    await createUser.fn.call(
      {
        req: {
          currentUser: { id: 'admin-id' },
        },
      },
      {
        email: 'manon@example.com',
        name: 'Manon Godebout',
        language: 'fr-FR',
      },
    );
  });
});
