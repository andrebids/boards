const { Readable } = require('stream');
const { expect } = require('chai');

const downloadPreview = require('../../api/controllers/project-presentations/download-preview');

describe('Project presentation preview controller', () => {
  let previousGlobals;
  let readPaths;
  let response;

  beforeEach(() => {
    previousGlobals = {
      Project: global.Project,
      ProjectPresentation: global.ProjectPresentation,
      sails: global.sails,
    };
    readPaths = [];
    response = {
      set: () => response,
      type: () => response,
    };
    global.ProjectPresentation = {
      qm: {
        getOneById: async () => ({
          id: 'presentation-1',
          projectId: 'project-1',
          boardId: 'board-1',
          documentData: {
            filename: 'presentation-new.pptx',
            preview: {
              status: 'ready',
              sourceFilename: 'presentation-new.pptx',
              filename: 'preview-presentation-new.jpg',
              mimeType: 'image/jpeg',
            },
          },
        }),
      },
    };
    global.Project = {
      qm: {
        getOneById: async () => ({ id: 'project-1' }),
      },
    };
    global.sails = {
      config: {
        custom: { attachmentsPathSegment: 'private/attachments' },
      },
      helpers: {
        presentations: {
          getProjectAccess: async () => ({ accessibleBoardIds: ['board-1'] }),
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => ({
            read: async (filePath) => {
              readPaths.push(filePath);
              return Readable.from(['preview']);
            },
          }),
        },
      },
    };
  });

  afterEach(() => {
    Object.assign(global, previousGlobals);
  });

  it('serves only the ready preview for the current PPTX version', async () => {
    const result = await downloadPreview.fn.call(
      { req: { currentUser: { id: 'user-1' } }, res: response },
      { id: 'presentation-1' },
      { success: (stream) => stream },
    );

    expect(result).to.be.instanceOf(Readable);
    expect(readPaths).to.deep.equal([
      'private/attachments/project-presentations/presentation-1/preview-presentation-new.jpg',
    ]);
  });
});
