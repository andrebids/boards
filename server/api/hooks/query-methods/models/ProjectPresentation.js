const createOne = (values) => ProjectPresentation.create({ ...values }).fetch().decrypt();

const getOneById = (id) => ProjectPresentation.findOne(id).decrypt();

const getByProjectId = (projectId) =>
  ProjectPresentation.find({ projectId }).sort('id').decrypt();

const getOneByBoardId = (boardId) => ProjectPresentation.findOne({ boardId }).decrypt();

const updateOne = (criteria, values) =>
  ProjectPresentation.updateOne(criteria).set({ ...values }).decrypt();

module.exports = {
  createOne,
  getByProjectId,
  getOneById,
  getOneByBoardId,
  updateOne,
};
