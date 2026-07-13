const { expect } = require('chai');

const { isPassword } = require('../../../utils/validators');
const generateTemporaryPassword = require('../../../api/helpers/users/generate-temporary-password');

describe('User onboarding helpers', () => {
  describe('users.generateTemporaryPassword', () => {
    it('generates unique strong passwords with every required character group', () => {
      const passwords = Array.from({ length: 50 }, () => generateTemporaryPassword.fn());

      passwords.forEach((password) => {
        expect(password).to.have.lengthOf(20);
        expect(password).to.match(/[A-Z]/);
        expect(password).to.match(/[a-z]/);
        expect(password).to.match(/[0-9]/);
        expect(password).to.match(/[!@#$%*\-_=+]/);
        expect(isPassword(password)).to.equal(true);
      });

      expect(new Set(passwords).size).to.equal(passwords.length);
    });
  });
});
