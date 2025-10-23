/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => FinanceMember.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => FinanceMember.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => FinanceMember.findOne(id);

const update = (criteria, values) => FinanceMember.update(criteria).set({ ...values });

const updateOne = (criteria, values) => FinanceMember.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => FinanceMember.destroyOne(criteria);

const delete_ = (criteria) => FinanceMember.destroy(criteria).fetch();

module.exports = {
  createOne,
  getByIds,
  getOneById,
  update,
  updateOne,
  deleteOne,
  delete: delete_,
};
