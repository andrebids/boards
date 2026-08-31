/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const _ = require('lodash');

const useConnection = (query, connection) =>
  connection ? query.usingConnection(connection) : query;

const defaultFind = (criteria, { sort = 'id', limit, connection } = {}) =>
  useConnection(Task.find(criteria).sort(sort).limit(limit), connection);

/* Query methods */

const create = (arrayOfValues) => Task.createEach(arrayOfValues).fetch();

const createOne = (values) => Task.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getByTaskListId = async (
  taskListId,
  { exceptIdOrIds, parentTaskId, sort = ['position', 'id'] } = {},
) => {
  const criteria = {
    taskListId,
  };

  if (exceptIdOrIds) {
    criteria.id = {
      '!=': exceptIdOrIds,
    };
  }

  if (!_.isUndefined(parentTaskId)) {
    criteria.parentTaskId = parentTaskId;
  }

  return defaultFind(criteria, { sort });
};

const getByTaskListIds = async (
  taskListIds,
  { sort = ['position', 'id'], connection } = {},
) =>
  defaultFind(
    {
      taskListId: taskListIds,
    },
    { sort, connection },
  );

const getOneById = (id, { taskListId } = {}) => {
  const criteria = {
    id,
  };

  if (taskListId) {
    criteria.taskListId = taskListId;
  }

  return Task.findOne(criteria);
};

const update = (criteria, values, { connection } = {}) =>
  useConnection(Task.update(criteria).set(values).fetch(), connection);

const updateOne = (criteria, values, { connection } = {}) =>
  useConnection(Task.updateOne(criteria).set({ ...values }), connection);

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => Task.destroy(criteria).fetch();

const deleteOne = (criteria) => Task.destroyOne(criteria);

module.exports = {
  create,
  createOne,
  getByIds,
  getByTaskListId,
  getByTaskListIds,
  getOneById,
  update,
  updateOne,
  deleteOne,
  delete: delete_,
};
