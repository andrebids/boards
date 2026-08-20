const createOne = (values) => ProjectPresentation.create({ ...values }).fetch();

const getOneById = (id) => ProjectPresentation.findOne(id);

const getOneByProjectId = (projectId) => ProjectPresentation.findOne({ projectId });

const updateOne = (criteria, values) => ProjectPresentation.updateOne(criteria).set({ ...values });

module.exports = {
  createOne,
  getOneById,
  getOneByProjectId,
  updateOne,
};
