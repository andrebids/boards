const { expect } = require('chai');
const generatePassword = require('../../../../api/controllers/users/generate-password');
const adminPolicy = require('../../../../api/policies/is-admin');
const UserModel = require('../../../../api/models/User');
const { policies } = require('../../../../config/policies');

describe('users/generate-password', () => {
  const originalSails = global.sails;
  const originalUser = global.User;

  afterEach(() => {
    global.sails = originalSails;
    global.User = originalUser;
  });

  it('returns the existing onboarding generator result without persisting it', async () => {
    let calls = 0;
    global.sails = {
      helpers: {
        users: {
          generateTemporaryPassword: () => {
            calls += 1;
            return 'generated-test-password';
          },
        },
      },
    };
    const headers = {};
    const result = await generatePassword.fn.call({
      res: {
        set: (name, value) => {
          headers[name] = value;
        },
      },
    });
    expect(calls).to.equal(1);
    expect(result).to.deep.equal({ item: { password: 'generated-test-password' } });
    expect(headers['Cache-Control']).to.equal('no-store');
  });

  it('requires authentication and limits generation to admins', async () => {
    expect(policies['users/generate-password']).to.deep.equal(['is-authenticated', 'is-admin']);
    global.User = UserModel;
    await Promise.all(
      Object.values(UserModel.Roles).map(async (role) => {
        const allowed = await adminPolicy(
          { currentUser: { role } },
          { notFound: () => false },
          () => true,
        );
        expect(allowed).to.equal(role === UserModel.Roles.ADMIN);
      }),
    );
  });
});
