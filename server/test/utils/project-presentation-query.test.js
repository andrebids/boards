const { expect } = require('chai');

const queryMethods = require('../../api/hooks/query-methods/models/ProjectPresentation');

describe('ProjectPresentation query methods', () => {
  afterEach(() => {
    delete global.ProjectPresentation;
  });

  it('lists all presentations for a project and finds the presentation for one board', async () => {
    const presentations = [
      { id: 'presentation-1', projectId: 'project-1', boardId: 'board-1' },
      { id: 'presentation-2', projectId: 'project-1', boardId: 'board-2' },
    ];

    global.ProjectPresentation = {
      find: (criteria) => ({
        sort: async () => (criteria.projectId === 'project-1' ? presentations : []),
      }),
      findOne: async (criteria) =>
        presentations.find(({ boardId }) => boardId === criteria.boardId) || null,
    };

    expect(await queryMethods.getByProjectId('project-1')).to.deep.equal(presentations);
    expect(await queryMethods.getOneByBoardId('board-2')).to.deep.equal(presentations[1]);
  });
});
