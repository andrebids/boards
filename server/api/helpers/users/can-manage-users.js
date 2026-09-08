module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return [User.Roles.ADMIN, User.Roles.USER_MANAGER].includes(inputs.record.role);
  },
};
