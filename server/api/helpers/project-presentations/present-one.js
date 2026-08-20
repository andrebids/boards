/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  inputs: {
    record: { type: 'ref', required: true },
    canEdit: { type: 'boolean', required: true },
  },

  fn(inputs) {
    const { cryptpadEditKey, cryptpadViewKey, ...presentation } = inputs.record;

    return {
      ...presentation,
      cryptpadSessionKey: inputs.canEdit ? cryptpadEditKey : cryptpadViewKey,
      cryptpadMode: inputs.canEdit ? 'edit' : 'view',
    };
  },
};
