import { isPassword } from './validator';

describe('password validation', () => {
  it('requires at least eight characters and sufficient strength', () => {
    expect(isPassword('aB3!xyz')).toBe(false);
    expect(isPassword('12345678')).toBe(false);
    expect(isPassword('T7#mQ2@z')).toBe(true);
  });
});
