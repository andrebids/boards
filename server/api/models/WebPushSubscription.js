/*! Copyright (c) 2024 PLANKA Software GmbH */

module.exports = {
  attributes: {
    endpoint: {
      type: 'string',
      required: true,
      maxLength: 2048,
    },
    p256dh: {
      type: 'string',
      required: true,
      maxLength: 128,
      columnName: 'p_256_dh',
    },
    auth: {
      type: 'string',
      required: true,
      maxLength: 64,
    },
    expirationTime: {
      type: 'number',
      allowNull: true,
      columnName: 'expiration_time',
    },
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },

  tableName: 'web_push_subscription',
};
