const { expect } = require('chai');

const { isPassword } = require('../../../utils/validators');
const generateTemporaryPassword = require('../../../api/helpers/users/generate-temporary-password');
const generateUsername = require('../../../api/helpers/users/generate-username');

describe('User onboarding helpers', () => {
  describe('users.generateTemporaryPassword', () => {
    it('generates unique strong passwords with every required character group', () => {
      const passwords = Array.from({ length: 50 }, () => generateTemporaryPassword.fn());

      passwords.forEach((password) => {
        expect(password).to.have.lengthOf(8);
        expect(password).to.match(/[A-Z]/);
        expect(password).to.match(/[a-z]/);
        expect(password).to.match(/[0-9]/);
        expect(password).to.match(/[!@#$%*\-_=+]/);
        expect(isPassword(password)).to.equal(true);
      });

      expect(new Set(passwords).size).to.equal(passwords.length);
    });
  });

  describe('users.generateUsername', () => {
    it('normalizes a person name into a valid username', () => {
      expect(generateUsername.fn({ name: 'João da Silva' })).to.equal('joao.da.silva');
    });

    it('adds a suffix while keeping the username within its limit', () => {
      const username = generateUsername.fn({
        name: 'Alexandre Pessoa Muito Conhecida',
        suffix: 2,
      });

      expect(username).to.equal('alexandre.pess.2');
      expect(username).to.have.lengthOf.at.most(16);
    });
  });

  describe('password validation', () => {
    it('requires at least eight characters and sufficient strength', () => {
      expect(isPassword('aB3!xyz')).to.equal(false);
      expect(isPassword('12345678')).to.equal(false);
      expect(isPassword('T7#mQ2@z')).to.equal(true);
    });
  });
});
