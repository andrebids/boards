/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => ProjectFinance.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => ProjectFinance.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => ProjectFinance.findOne(id);

const update = (criteria, values) => ProjectFinance.update(criteria).set({ ...values });

const updateOne = (criteria, values) => ProjectFinance.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => ProjectFinance.destroyOne(criteria);

const delete_ = (criteria) => ProjectFinance.destroy(criteria).fetch();

module.exports = {
  createOne,
  getByIds,
  getOneById,
  update,
  updateOne,
  deleteOne,
  delete: delete_,
};
