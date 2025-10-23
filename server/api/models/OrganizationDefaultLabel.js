/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'organization_default_label',
  
  attributes: {
    name: {
      type: 'string',
      required: true,
      maxLength: 60,
      columnName: 'name',
    },
    color: {
      type: 'string',
      required: true,
      isIn: require('./Label').COLORS, // ⚠️ Importante: usa cores do Planka
      columnName: 'color',
    },
    position: {
      type: 'number',
      defaultsTo: 0,
      columnName: 'position',
    },
    createdAt: {
      type: 'ref',
      columnType: 'timestamptz',
      columnName: 'created_at',
    },
    updatedAt: {
      type: 'ref',
      columnType: 'timestamptz',
      columnName: 'updated_at',
    },
  },
};

