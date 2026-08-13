/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const create = (values) => (values.length > 0 ? GanttItemAssignee.createEach(values).fetch() : []);

const getByGanttItemIds = (ganttItemIds) =>
  ganttItemIds.length > 0 ? GanttItemAssignee.find({ ganttItemId: ganttItemIds }).sort('id') : [];

const deleteByGanttItemId = (ganttItemId) => GanttItemAssignee.destroy({ ganttItemId }).fetch();

module.exports = {
  create,
  getByGanttItemIds,
  deleteByGanttItemId,
};
