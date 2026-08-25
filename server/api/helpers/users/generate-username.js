/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const MAX_USERNAME_LENGTH = 16;

module.exports = {
  inputs: {
    name: {
      type: 'string',
      required: true,
    },
    suffix: {
      type: 'number',
      defaultsTo: 0,
    },
  },

  fn(inputs) {
    const normalizedName = inputs.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');

    const base = (normalizedName || 'user').padEnd(3, '0');
    const suffix = inputs.suffix > 0 ? `.${inputs.suffix}` : '';
    const baseLength = MAX_USERNAME_LENGTH - suffix.length;

    return `${base.slice(0, baseLength).replace(/\.$/, '')}${suffix}`;
  },
};
