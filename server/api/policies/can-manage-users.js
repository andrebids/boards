module.exports = async function canManageUsers(req, res, proceed) {
  if (!sails.helpers.users.canManageUsers(req.currentUser)) {
    return res.notFound(); // Forbidden
  }

  return proceed();
};
