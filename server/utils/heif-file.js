const fs = require('fs').promises;
const path = require('path');
const { rimraf } = require('rimraf');
const sharp = require('sharp');

const HEIF_EXTENSIONS = new Set(['.heic', '.heif']);
const HEIF_JPEG_QUALITY = 90;
const HEIF_MAX_INPUT_PIXELS = 80 * 1000 * 1000;
const HEIF_MAX_DIMENSION = 8192;

const isHeifFilename = (filename) =>
  HEIF_EXTENSIONS.has(path.extname(path.basename(filename || '')).toLowerCase());

const getJpegFilename = (filename) => {
  const parsed = path.parse(path.basename(filename));
  return `${parsed.name}.jpg`;
};

const convertHeifToJpeg = (sourcePath, outputPath) =>
  sharp(sourcePath, {
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
