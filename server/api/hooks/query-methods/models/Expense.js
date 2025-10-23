/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => Expense.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => Expense.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => Expense.findOne(id);

const update = (criteria, values) => Expense.update(criteria).set({ ...values });

const updateOne = (criteria, values) => Expense.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => Expense.destroyOne(criteria);

const delete_ = (criteria) => Expense.destroy(criteria).fetch();

module.exports = {
  createOne,
  getByIds,
  getOneById,
  update,
  updateOne,
  deleteOne,
  delete: delete_,
};
