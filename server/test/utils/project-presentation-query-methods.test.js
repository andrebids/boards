const { expect } = require('chai');

const queryMethods = require('../../api/hooks/query-methods/models/ProjectPresentation');

describe('Project presentation query methods', () => {
  it('decrypts session capabilities before returning presentation records', () => {
    const decrypted = {};
    let decryptCalls = 0;
    const query = {
      decrypt: () => {
        decryptCalls += 1;
        return decrypted;
      },
      fetch() {
        return this;
      },
      set() {
        return this;
      },
      sort() {
        return this;
      },
    };
    const previousProjectPresentation = global.ProjectPresentation;
    global.ProjectPresentation = {
      create: () => query,
      find: () => query,
      findOne: () => query,
      updateOne: () => query,
    };

    try {
      expect(queryMethods.createOne({})).to.equal(decrypted);
      expect(queryMethods.getByProjectId('project-1')).to.equal(decrypted);
      expect(queryMethods.getOneById('presentation-1')).to.equal(decrypted);
      expect(queryMethods.getOneByBoardId('board-1')).to.equal(decrypted);
      expect(queryMethods.updateOne('presentation-1', {})).to.equal(decrypted);
      expect(decryptCalls).to.equal(5);
    } finally {
      global.ProjectPresentation = previousProjectPresentation;
    }
  });
});
