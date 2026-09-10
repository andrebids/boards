module.exports = {
  async fn() {
    this.res.set('Cache-Control', 'no-store');

    return {
      item: {
        password: sails.helpers.users.generateTemporaryPassword(),
      },
    };
  },
};
