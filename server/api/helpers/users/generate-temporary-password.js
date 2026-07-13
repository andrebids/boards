/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

const { isPassword } = require('../../../utils/validators');

const CHARACTER_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%*-_=+',
];

const ALL_CHARACTERS = CHARACTER_GROUPS.join('');
const PASSWORD_LENGTH = 20;

const pickRandomCharacter = (characters) => characters[crypto.randomInt(characters.length)];

const shuffle = (characters) => {
  const result = [...characters];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.randomInt(index + 1);
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result.join('');
};

module.exports = {
  sync: true,

  inputs: {},

  fn() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const characters = CHARACTER_GROUPS.map(pickRandomCharacter);

      while (characters.length < PASSWORD_LENGTH) {
        characters.push(pickRandomCharacter(ALL_CHARACTERS));
      }

      const password = shuffle(characters);
      if (isPassword(password)) {
        return password;
      }
    }

    throw new Error('Could not generate a valid temporary password');
  },
};
