const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const processUploadedFile = require('../../api/helpers/attachments/process-uploaded-file');

describe('attachment image processing', () => {
  let previousGlobals;
  let temporaryDirectory;
  let temporaryFile;

  beforeEach(() => {
    previousGlobals = {
      FileReference: global.FileReference,
      sails: global.sails,
    };
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'planka-image-processing-'));
    temporaryFile = path.join(temporaryDirectory, 'screenshot.png');
    fs.writeFileSync(
      temporaryFile,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xf7pAAAAAElFTkSuQmCC',
        'base64',
      ),
    );

    global.FileReference = {
      create: () => ({
        fetch: async () => ({ id: 'file-reference-1' }),
      }),
      destroyOne: async () => {},
    };
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });

    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  it('starts both thumbnail writes without waiting for the first one to finish', async () => {
    let saveCount = 0;
    let releaseSaves;
    let notifySecondSave;
    const savesReleased = new Promise((resolve) => {
      releaseSaves = resolve;
    });
    const secondSaveStarted = new Promise((resolve) => {
      notifySecondSave = resolve;
    });

    global.sails = {
      config: {
        custom: {
          attachmentsPathSegment: 'attachments',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => ({
            deleteDir: async () => {},
            move: async () => temporaryFile,
            save: async () => {
              saveCount += 1;
              if (saveCount === 2) {
                notifySecondSave(true);
              }
              await savesReleased;
            },
          }),
        },
      },
      log: {
        info: () => {},
        warn: () => {},
      },
    };

    const processing = processUploadedFile.fn({
      file: {
        fd: temporaryFile,
        filename: 'screenshot.png',
        size: fs.statSync(temporaryFile).size,
        type: 'image/png',
      },
    });

    let bothSavesStarted;
    try {
      bothSavesStarted = await Promise.race([
        secondSaveStarted,
        new Promise((resolve) => {
          setTimeout(() => resolve(false), 250);
        }),
      ]);
      expect(bothSavesStarted).to.equal(true);
    } finally {
      releaseSaves();
      await processing;
    }

    expect(saveCount).to.equal(2);
  });
});
