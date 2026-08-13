/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const createOne = (values) => GanttItem.create({ ...values }).fetch();

const getByGanttPlanId = (ganttPlanId) => GanttItem.find({ ganttPlanId }).sort(['position', 'id']);

const getOneById = (id) => GanttItem.findOne(id);

const updateOne = (criteria, values) => GanttItem.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => GanttItem.destroyOne(criteria);

module.exports = {
  createOne,
  getByGanttPlanId,
  getOneById,
  updateOne,
  deleteOne,
};
