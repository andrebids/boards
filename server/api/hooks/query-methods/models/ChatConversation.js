/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) =>
  ChatConversation.find(criteria).sort([{ lastMessageAt: 'DESC' }, { id: 'DESC' }]);

const createOne = (values) => ChatConversation.create({ ...values }).fetch();

const getByProjectId = (projectId) => defaultFind({ projectId });

const getByProjectIds = (projectIds) =>
  projectIds.length > 0 ? defaultFind({ projectId: projectIds }) : [];

const getByIds = (ids) => (ids.length > 0 ? defaultFind({ id: ids }) : []);

const getOneById = (id) => ChatConversation.findOne(id);

const getOneProjectGroupByProjectId = (projectId) =>
  ChatConversation.findOne({
    projectId,
    type: ChatConversation.Types.PROJECT_GROUP,
  });

const getOneProjectDirectByProjectIdAndDirectKey = (projectId, directKey) =>
  ChatConversation.findOne({
    projectId,
    type: ChatConversation.Types.PROJECT_DIRECT,
    directKey,
  });

const getCustomGroupsByProjectId = (projectId) =>
  defaultFind({ projectId, type: ChatConversation.Types.PROJECT_CUSTOM_GROUP });

const updateOne = (criteria, values) => ChatConversation.updateOne(criteria).set({ ...values });

module.exports = {
  createOne,
  getByProjectId,
  getByProjectIds,
  getByIds,
  getOneById,
  getOneProjectGroupByProjectId,
  getOneProjectDirectByProjectIdAndDirectKey,
  getCustomGroupsByProjectId,
  updateOne,
};
