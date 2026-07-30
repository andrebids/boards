const path = require('path');

const VIDEO_EXTENSIONS = new Set([
  '3g2',
  '3gp',
  'asf',
  'avi',
  'flv',
  'm2ts',
  'm4v',
  'mkv',
  'mov',
  'mpe',
  'mpeg',
  'mpg',
  'mp4',
  'mts',
  'mxf',
  'ogv',
  'ts',
  'vob',
  'webm',
  'wmv',
]);

const isVideoFile = (filename, mimeType) => {
  if (mimeType && mimeType.startsWith('video/')) {
    return true;
  }

  const extension = path
    .extname(filename || '')
    .slice(1)
    .toLowerCase();
  return VIDEO_EXTENSIONS.has(extension);
};

module.exports = {
  VIDEO_EXTENSIONS,
  isVideoFile,
};
