const { expect } = require('chai');

describe('ProjectPresentation (model)', () => {
  let project;
  let firstBoard;
  let secondBoard;

  before(async () => {
    project = await Project.create({ name: 'Presentations project' }).fetch();
    firstBoard = await Board.create({
      projectId: project.id,
      position: 1,
      name: 'First board',
    }).fetch();
    secondBoard = await Board.create({
      projectId: project.id,
      position: 2,
      name: 'Second board',
    }).fetch();
  });

  it('stores and retrieves one independent presentation for each board', async () => {
    const firstPresentation = await ProjectPresentation.qm.createOne({
      projectId: project.id,
      boardId: firstBoard.id,
      title: 'First presentation',
      isEnabled: true,
    });
    const secondPresentation = await ProjectPresentation.qm.createOne({
      projectId: project.id,
      boardId: secondBoard.id,
      title: 'Second presentation',
      isEnabled: true,
    });

    const presentations = await ProjectPresentation.qm.getByProjectId(project.id);

    expect(presentations).to.have.lengthOf(2);
    expect(presentations.map(({ boardId }) => boardId)).to.have.members([
      firstBoard.id,
      secondBoard.id,
    ]);
    expect(await ProjectPresentation.qm.getOneByBoardId(secondBoard.id)).to.include({
      id: secondPresentation.id,
      projectId: project.id,
      boardId: secondBoard.id,
    });
    expect(firstPresentation.id).to.not.equal(secondPresentation.id);
  });
});
