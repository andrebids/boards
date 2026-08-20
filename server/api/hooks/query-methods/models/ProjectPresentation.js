const createOne = (values) => ProjectPresentation.create({ ...values }).fetch();

const getOneById = (id) => ProjectPresentation.findOne(id);

const getByProjectId = (projectId) => ProjectPresentation.find({ projectId }).sort('id');

const getOneByBoardId = (boardId) => ProjectPresentation.findOne({ boardId });

const updateOne = (criteria, values) => ProjectPresentation.updateOne(criteria).set({ ...values });

module.exports = {
  createOne,
  getByProjectId,
  getOneById,
  getOneByBoardId,
  updateOne,
};
