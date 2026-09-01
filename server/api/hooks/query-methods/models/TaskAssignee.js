const useConnection = (query, connection) =>
  connection ? query.usingConnection(connection) : query;

const create = (values, { connection } = {}) =>
  values.length > 0 ? useConnection(TaskAssignee.createEach(values).fetch(), connection) : [];

const getByTaskIds = (taskIds, { connection } = {}) =>
  taskIds.length > 0
    ? useConnection(TaskAssignee.find({ taskId: taskIds }).sort('id'), connection)
    : [];

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria, { connection } = {}) =>
  useConnection(TaskAssignee.destroy(criteria).fetch(), connection);

module.exports = {
  create,
  getByTaskIds,
  delete: delete_,
};
