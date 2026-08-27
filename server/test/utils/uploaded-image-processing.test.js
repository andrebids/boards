const fs = require('fs');
const os = require('os');
const path = require('path');

const { expect } = require('chai');
const { rimraf } = require('rimraf');
const sharp = require('sharp');

const processUploadedBackgroundFile = require('../../api/helpers/background-images/process-uploaded-file');
const processUploadedAvatarFile = require('../../api/helpers/users/process-uploaded-avatar-file');

describe('uploaded image processing', () => {
  let originalSails;
  let tempDir;
  let savedFiles;
  let deletedDirs;

  beforeEach(async () => {
    originalSails = global.sails;
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'planka-uploaded-image-'));
    savedFiles = [];
    deletedDirs = [];

    global.sails = {
      config: {
        custom: {
          backgroundImagesPathSegment: 'background-images',
          userAvatarsPathSegment: 'user-avatars',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => ({
            save: async (filePath, buffer, type) => {
              savedFiles.push({ filePath, buffer, type });
            },
            deleteDir: async (dirPath) => {
              deletedDirs.push(dirPath);
            },
          }),
        },
      },
      log: {
        warn: () => {},
      },
    };
  });

  afterEach(async () => {
    global.sails = originalSails;
    await rimraf(tempDir);
  });

  const createUpload = async (filename) => {
    const filePath = path.join(tempDir, filename);

    await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: '#336699',
      },
    })
      .png()
      .toFile(filePath);

    return {
      fd: filePath,
      filename,
      type: 'image/png',
    };
  };

  it('keeps the richer background and avatar variants while sharing the processing', async () => {
    const backgroundUpload = await createUpload('background.png');
    const background = await processUploadedBackgroundFile.fn({ file: backgroundUpload });

    expect(background.extension).to.equal('png');
    expect(savedFiles.map(({ filePath }) => filePath)).to.deep.equal([
      `background-images/${background.dirname}/original.png`,
      `background-images/${background.dirname}/outside-360.png`,
    ]);
    expect(fs.existsSync(backgroundUpload.fd)).to.equal(false);

    savedFiles = [];

    const avatarUpload = await createUpload('avatar.png');
    const avatar = await processUploadedAvatarFile.fn({ file: avatarUpload });

    expect(avatar.extension).to.equal('png');
    expect(savedFiles.map(({ filePath }) => filePath)).to.deep.equal([
      `user-avatars/${avatar.dirname}/original.png`,
      `user-avatars/${avatar.dirname}/cover-180.png`,
    ]);
    expect(await sharp(savedFiles[1].buffer).metadata()).to.include({
      width: 180,
      height: 180,
    });
    expect(fs.existsSync(avatarUpload.fd)).to.equal(false);
    expect(deletedDirs).to.deep.equal([]);
  });

  it('rejects unsupported uploads and removes the temporary file', async () => {
    const filePath = path.join(tempDir, 'background.svg');
    await fs.promises.writeFile(filePath, '<svg xmlns="http://www.w3.org/2000/svg" />');

    let error;
    try {
      await processUploadedBackgroundFile.fn({
        file: {
          fd: filePath,
          filename: 'background.svg',
          type: 'image/svg+xml',
        },
      });
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.equal('fileIsNotImage');
    expect(fs.existsSync(filePath)).to.equal(false);
    expect(savedFiles).to.deep.equal([]);
  });

  it('cleans stored and temporary files when image processing fails', async () => {
    global.sails.hooks['file-manager'].getInstance = () => ({
      save: async () => {
        throw new Error('storage unavailable');
      },
      deleteDir: async (dirPath) => {
        deletedDirs.push(dirPath);
      },
    });

    const upload = await createUpload('avatar.png');

    let error;
    try {
      await processUploadedAvatarFile.fn({ file: upload });
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.equal('fileIsNotImage');
    expect(deletedDirs).to.have.length(1);
    expect(deletedDirs[0]).to.match(/^user-avatars\//);
    expect(fs.existsSync(upload.fd)).to.equal(false);
  });
});
