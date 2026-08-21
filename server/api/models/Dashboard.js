module.exports = {
  tableName: 'dashboard',

  attributes: {
    key: {
      type: 'string',
      required: true,
      unique: true,
    },
    layout: {
      type: 'json',
      defaultsTo: [],
    },
    codexUsage: {
      type: 'json',
      columnName: 'codex_usage',
    },
    version: {
      type: 'number',
      defaultsTo: 1,
    },
    editLockUserId: {
      model: 'User',
      columnName: 'edit_lock_user_id',
    },
    editLockExpiresAt: {
      type: 'ref',
      columnType: 'timestamp with time zone',
      columnName: 'edit_lock_expires_at',
    },
  },
};
