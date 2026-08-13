/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const createOne = (values) => GanttPlan.create({ ...values }).fetch();

const getOneById = (id) => GanttPlan.findOne(id);

const getOneByProjectId = (projectId) => GanttPlan.findOne({ projectId });

const updateOne = (criteria, values) => GanttPlan.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => GanttPlan.destroyOne(criteria);

module.exports = {
  createOne,
  getOneById,
  getOneByProjectId,
  updateOne,
  deleteOne,
};
