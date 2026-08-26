/*! Copyright (c) 2024 PLANKA Software GmbH */

const useConnection = (query, db) => (db ? query.usingConnection(db) : query);

const createOne = (values, db) =>
  useConnection(WebPushSubscription.create({ ...values }).fetch(), db);

const getByUserId = (userId, db) =>
  useConnection(WebPushSubscription.find({ userId }).sort('createdAt ASC'), db);

const getOneByEndpoint = (endpoint, db) =>
  useConnection(WebPushSubscription.findOne({ endpoint }), db);

const updateOne = (criteria, values, db) =>
  useConnection(WebPushSubscription.updateOne(criteria).set({ ...values }), db);

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria, db) => useConnection(WebPushSubscription.destroy(criteria).fetch(), db);

const deleteOne = (criteria, db) => useConnection(WebPushSubscription.destroyOne(criteria), db);

module.exports = {
  createOne,
  getByUserId,
  getOneByEndpoint,
  updateOne,
  deleteOne,
  delete: delete_,
};
