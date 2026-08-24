const { expect } = require('chai');

const removeRelatedFiles = require('../../api/helpers/project-presentations/remove-related-files');

describe('Project presentation files', () => {
  let previousSails;
  let deletedPaths;

  beforeEach(() => {
    previousSails = global.sails;
    deletedPaths = [];
    global.sails = {
      config: {
        custom: {
          attachmentsPathSegment: 'private/attachments',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => ({
            deleteDir: async (path) => {
              deletedPaths.push(path);
            },
          }),
        },
      },
      log: {
        error: () => {},
      },
    };
  });

  afterEach(() => {
    global.sails = previousSails;
  });

  it('removes every stored file version when presentations are deleted', async () => {
    await removeRelatedFiles.fn({
      recordOrRecords: [{ id: 'presentation-1' }, { id: 'presentation-2' }],
    });

    expect(deletedPaths).to.deep.equal([
      'private/attachments/project-presentations/presentation-1',
      'private/attachments/project-presentations/presentation-2',
    ]);
  });
});
