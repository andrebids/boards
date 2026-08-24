const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { expect } = require('chai');

const { normalizeHeifUpload } = require('../../utils/heif-file');

const fileExists = async (filePath) => {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

describe('HEIF upload normalization', () => {
  let tempDirectory;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'planka-heif-upload-'));
  });

  afterEach(async () => {
    await fs.rm(tempDirectory, { force: true, recursive: true });
  });

  it('converts HEIC uploads to JPEG and removes the original temporary file', async () => {
    const inputPath = path.join(tempDirectory, 'upload');
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    await fs.writeFile(inputPath, Buffer.from('heic'));

    const result = await normalizeHeifUpload(
      {
        fd: inputPath,
        filename: 'iphone-photo.HEIC',
        size: 4,
        type: 'image/heic',
      },
      {
        convert: async (_sourcePath, outputPath) => fs.writeFile(outputPath, jpeg),
        maxBytes: 25,
      },
    );

    expect(result).to.include({
      filename: 'iphone-photo.jpg',
      size: jpeg.length,
      type: 'image/jpeg',
    });
    expect(await fs.readFile(result.fd)).to.deep.equal(jpeg);
    expect(await fileExists(inputPath)).to.equal(false);
  });

  it('rejects oversized JPEG results and removes the partial conversion', async () => {
    const inputPath = path.join(tempDirectory, 'upload');
    await fs.writeFile(inputPath, Buffer.from('heic'));

    let error;
    try {
      await normalizeHeifUpload(
        { fd: inputPath, filename: 'photo.heif', size: 4, type: 'image/heif' },
        {
          convert: async (_sourcePath, outputPath) => fs.writeFile(outputPath, Buffer.alloc(26)),
          maxBytes: 25,
        },
      );
    } catch (nextError) {
      error = nextError;
    }

    expect(error).to.have.property('code', 'HEIF_CONVERSION_TOO_LARGE');
    expect(await fileExists(`${inputPath}.jpg`)).to.equal(false);
    expect((await fs.stat(inputPath)).isFile()).to.equal(true);
  });
});
