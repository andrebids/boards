/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const getByIds = (ids) => (ids.length > 0 ? ChatLinkPreview.find({ id: ids }) : []);

const getOneByProjectIdAndNormalizedUrl = (projectId, normalizedUrl) =>
  ChatLinkPreview.findOne({ projectId, normalizedUrl });

const createOne = (values) => ChatLinkPreview.create({ ...values }).fetch();

const updateOne = (criteria, values) => ChatLinkPreview.updateOne(criteria).set({ ...values });

module.exports = {
  getByIds,
  getOneByProjectIdAndNormalizedUrl,
  createOne,
  updateOne,
};
