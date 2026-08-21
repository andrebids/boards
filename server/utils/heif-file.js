const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { rimraf } = require('rimraf');
const sharp = require('sharp');

const HEIF_EXTENSIONS = new Set(['.heic', '.heif']);
const HEIF_JPEG_QUALITY = 90;
const HEIF_MAX_INPUT_PIXELS = 80 * 1000 * 1000;
const HEIF_MAX_DIMENSION = 8192;
const HEIF_CONVERSION_TIMEOUT_MS = 120 * 1000;

const execFileAsync = promisify(execFile);

const isHeifFilename = (filename) =>
  HEIF_EXTENSIONS.has(path.extname(path.basename(filename || '')).toLowerCase());

const getJpegFilename = (filename) => {
  const parsed = path.parse(path.basename(filename));
  return `${parsed.name}.jpg`;
};

const assertSafeHeifDimensions = async (sourcePath) => {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'json',
      sourcePath,
    ],
    {
      maxBuffer: 64 * 1024,
      timeout: HEIF_CONVERSION_TIMEOUT_MS,
    },
  );

  const [{ width, height } = {}] = JSON.parse(stdout).streams || [];
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > HEIF_MAX_INPUT_PIXELS
  ) {
    const error = new Error('HEIF image dimensions are unsupported');
    error.code = 'HEIF_DIMENSIONS_UNSUPPORTED';
    throw error;
  }
};

const convertHeifToJpeg = async (sourcePath, outputPath) => {
  const decodedPath = `${outputPath}.decoded.jpg`;

  try {
    await assertSafeHeifDimensions(sourcePath);
    await execFileAsync(
      'ffmpeg',
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        sourcePath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        decodedPath,
      ],
      {
        maxBuffer: 1024 * 1024,
        timeout: HEIF_CONVERSION_TIMEOUT_MS,
      },
    );

    await sharp(decodedPath, {
      limitInputPixels: HEIF_MAX_INPUT_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: HEIF_MAX_DIMENSION,
        height: HEIF_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ mozjpeg: true, quality: HEIF_JPEG_QUALITY })
      .toFile(outputPath);
  } finally {
    await rimraf(decodedPath);
  }
};

const normalizeHeifUpload = async (
  file,
  { convert = convertHeifToJpeg, maxBytes = Infinity } = {},
) => {
  if (!isHeifFilename(file && file.filename)) {
    return file;
  }

  const outputPath = `${file.fd}.jpg`;

  try {
    await convert(file.fd, outputPath);
    const { size } = await fs.stat(outputPath);

    if (size === 0 || size > maxBytes) {
      const error = new Error('Converted HEIF image exceeds the attachment size limit');
      error.code = 'HEIF_CONVERSION_TOO_LARGE';
      throw error;
    }

    await rimraf(file.fd);

    return {
      ...file,
      fd: outputPath,
      filename: getJpegFilename(file.filename),
      size,
      type: 'image/jpeg',
    };
  } catch (error) {
    await rimraf(outputPath);
    throw error;
  }
};

module.exports = {
  getJpegFilename,
  isHeifFilename,
  normalizeHeifUpload,
};
