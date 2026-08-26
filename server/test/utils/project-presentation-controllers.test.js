const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { expect } = require('chai');

const uploadFile = require('../../api/controllers/project-presentations/upload-file');
const updateCryptpadKey = require('../../api/controllers/project-presentations/update-cryptpad-key');

const makeCentralDirectoryEntry = (filename) => {
  const encodedFilename = Buffer.from(filename);
  const entry = Buffer.alloc(46 + encodedFilename.length);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(encodedFilename.length, 28);
  encodedFilename.copy(entry, 46);
  return entry;
};

const makePptxFile = () => {
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  const centralDirectory = Buffer.concat([
    makeCentralDirectoryEntry('[Content_Types].xml'),
    makeCentralDirectoryEntry('ppt/presentation.xml'),
  ]);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(2, 8);
  endRecord.writeUInt16LE(2, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localHeader.length, 16);

  return Buffer.concat([localHeader, centralDirectory, endRecord]);
};

describe('Project presentation controllers', () => {
  let previousGlobals;
  let tempDirectory;

  beforeEach(async () => {
    previousGlobals = {
      Project: global.Project,
      ProjectPresentation: global.ProjectPresentation,
      Board: global.Board,
      sails: global.sails,
      _: global._,
    };
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planka-presentation-controller-'));
    global._ = require('lodash'); // eslint-disable-line global-require
  });

  afterEach(async () => {
    await fs.rm(tempDirectory, { force: true, recursive: true });
    Object.assign(global, previousGlobals);
  });

  it('stores a verified replacement separately before retiring the previous snapshot', async () => {
    const file = {
      fd: path.join(tempDirectory, 'upload.pptx'),
      filename: 'deck.pptx',
      size: 0,
      type: 'application/octet-stream',
    };
    const savedPaths = [];
    const deletedPaths = [];
    const infoEvents = [];
    const enqueuedJobs = [];
    const broadcasts = [];
    let updatedValues;

    await fs.writeFile(file.fd, makePptxFile());
    file.size = (await fs.stat(file.fd)).size;

    global.ProjectPresentation = {
      qm: {
        getOneById: async () => ({
          id: 'presentation-1',
          projectId: 'project-1',
          boardId: 'board-1',
          documentData: {
            filename: 'presentation.pptx',
            preview: {
              filename: 'preview-presentation-old.jpg',
            },
          },
        }),
        updateOne: async (id, values) => {
          updatedValues = values;
          return { id, ...values };
        },
      },
    };
    global.Project = {
      qm: {
        getOneById: async () => ({ id: 'project-1' }),
      },
    };
    global.sails = {
      config: {
        custom: { attachmentMaxBytes: 1024 * 1024, attachmentsPathSegment: 'private/attachments' },
      },
      helpers: {
        presentations: {
          getProjectAccess: async () => ({ canEdit: false, accessibleBoardIds: ['board-1'] }),
        },
        utils: {
          receiveFile: {
            with: async () => [file],
          },
        },
        projectPresentations: {
          presentOne: (presentation) => presentation,
        },
        projectPresentationPreview: {
          enqueue: {
            with: async (job) => enqueuedJobs.push(job),
          },
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => ({
            saveFromPath: async (filePath) => {
              savedPaths.push(filePath);
            },
            delete: async (filePath) => {
              deletedPaths.push(filePath);
            },
          }),
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
      log: { info: (...args) => infoEvents.push(args), warn: () => {} },
    };

    const result = await uploadFile.fn.call(
      { req: { currentUser: { id: 'user-1' } } },
      { id: 'presentation-1' },
      { success: (payload) => payload },
    );

    expect(savedPaths).to.have.lengthOf(1);
    expect(savedPaths[0]).to.match(
      /^private\/attachments\/project-presentations\/presentation-1\/presentation-[\w-]+\.pptx$/,
    );
    expect(updatedValues.documentData).to.include({
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sizeInBytes: file.size,
    });
    expect(updatedValues.documentData.filename).to.equal(savedPaths[0].split('/').at(-1));
    expect(updatedValues.documentData.preview).to.deep.equal({
      status: 'pending',
      sourceFilename: updatedValues.documentData.filename,
    });
    expect(enqueuedJobs).to.deep.equal([
      { presentationId: 'presentation-1', sourceFilename: updatedValues.documentData.filename },
    ]);
    expect(broadcasts).to.deep.equal([
      [
        'projectPresentation:presentation-1',
        'projectPresentationUpdate',
        {
          item: {
            id: 'presentation-1',
            documentData: updatedValues.documentData,
          },
        },
      ],
    ]);
    expect(deletedPaths).to.deep.equal([
      'private/attachments/project-presentations/presentation-1/presentation.pptx',
      'private/attachments/project-presentations/presentation-1/preview-presentation-old.jpg',
    ]);
    expect(result.item.documentData.filename).to.equal(updatedValues.documentData.filename);
    expect(infoEvents).to.deep.include([
      'Project presentation upload completed',
      { presentationId: 'presentation-1', phase: 'completed' },
    ]);
  });

  it('notifies board users about a successful key rotation without broadcasting either key', async () => {
    const broadcasts = [];
    const updatedPresentation = {
      id: 'presentation-1',
      projectId: 'project-1',
      boardId: 'board-1',
      cryptpadEditKey: 'edit-secret',
      cryptpadViewKey: 'view-secret',
      cryptpadKeyVersion: 2,
    };

    global.ProjectPresentation = {
      qm: {
        getOneById: async () => ({ ...updatedPresentation, cryptpadKeyVersion: 1 }),
        updateOne: async () => updatedPresentation,
      },
    };
    global.Project = {
      qm: {
        getOneById: async () => ({ id: 'project-1' }),
      },
    };
    global.Board = {
      qm: {
        getOneById: async () => ({ id: 'board-1' }),
      },
    };
    global.sails = {
      helpers: {
        presentations: {
          getProjectAccess: async () => ({ canEdit: true, accessibleBoardIds: ['board-1'] }),
        },
        projects: {
          makeScoper: {
            with: () => ({
              getBoardRelatedUserIds: async () => ['user-1', 'user-2'],
            }),
          },
        },
      },
      sockets: {
        broadcast: (...args) => broadcasts.push(args),
      },
    };

    const result = await updateCryptpadKey.fn.call(
      { req: { currentUser: { id: 'user-1' } } },
      { id: 'presentation-1', keyVersion: 1, editKey: 'edit-secret', viewKey: 'view-secret' },
    );

    expect(result).to.deep.equal({ key: 'edit-secret', keyVersion: 2 });
    expect(broadcasts).to.have.lengthOf(2);
    broadcasts.forEach(([, eventName, payload]) => {
      expect(eventName).to.equal('projectPresentationUpdate');
      expect(payload.item).to.not.have.any.keys('cryptpadEditKey', 'cryptpadViewKey');
      expect(payload.item).to.include({ id: 'presentation-1', cryptpadKeyVersion: 2 });
    });
  });
});
