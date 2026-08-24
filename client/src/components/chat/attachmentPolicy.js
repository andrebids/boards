export const CHAT_ATTACHMENT_ALLOWED_EXTENSIONS = Object.freeze([
  'aac',
  'avif',
  'bmp',
  'csv',
  'docx',
  'flac',
  'gif',
  'jpeg',
  'jpg',
  'json',
  'm4a',
  'm4v',
  'md',
  'mov',
  'mp3',
  'mp4',
  'ogg',
  'pdf',
  'png',
  'psb',
  'psd',
  'pptx',
  'tif',
  'tiff',
  'txt',
  'wav',
  'webm',
  'webp',
  'xlsx',
]);

export const CHAT_ATTACHMENT_MAX_BYTES = 500 * 1024 * 1024;
export const PSD_ATTACHMENT_MAX_BYTES = 1024 * 1024 * 1024;
export const VIDEO_ATTACHMENT_MAX_BYTES = 250 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set(['3g2', '3gp', 'm4v', 'mov', 'mp4', 'ogg', 'webm']);

const DANGEROUS_EXTENSIONS = new Set([
  'apk',
  'app',
  'bat',
  'bin',
  'cmd',
  'com',
  'cpl',
  'dll',
  'dmg',
  'exe',
  'gadget',
  'hta',
  'inf',
  'ins',
  'iso',
  'jar',
  'js',
  'jse',
  'lnk',
  'msi',
  'msp',
  'pif',
  'ps1',
  'reg',
  'scr',
  'sh',
  'svg',
  'sys',
  'vb',
  'vbe',
  'vbs',
  'ws',
  'wsc',
  'wsf',
  'wsh',
]);

export const CHAT_ATTACHMENT_ACCEPT = CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

export const getChatAttachmentExtension = (filename) => {
  if (typeof filename !== 'string' || filename.includes('\0')) {
    return null;
  }

  const basename = filename.replace(/\\/g, '/').split('/').pop().toLowerCase();
  const lastDotIndex = basename.lastIndexOf('.');
  return lastDotIndex > -1 && lastDotIndex < basename.length - 1
    ? basename.slice(lastDotIndex + 1)
    : null;
};

export const isChatAttachmentAllowed = (file) => {
  const extension = getChatAttachmentExtension(file?.name);
  if (!extension || !CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension)) {
    return false;
  }

  const parts = file.name.replace(/\\/g, '/').split('/').pop().toLowerCase().split('.');
  return !parts.slice(1, -1).some((part) => DANGEROUS_EXTENSIONS.has(part));
};

export const isChatPsdAttachment = (file) =>
  ['psb', 'psd'].includes(getChatAttachmentExtension(file?.name));

export const isChatVideoAttachment = (file) =>
  VIDEO_EXTENSIONS.has(getChatAttachmentExtension(file?.name));

export const getChatAttachmentMaxBytes = (file, limits = {}) => {
  if (isChatPsdAttachment(file)) {
    return limits.psd || PSD_ATTACHMENT_MAX_BYTES;
  }
  if (isChatVideoAttachment(file)) {
    return limits.video || VIDEO_ATTACHMENT_MAX_BYTES;
  }

  return limits.default || CHAT_ATTACHMENT_MAX_BYTES;
};

export const isChatAttachmentTooLarge = (file, limits) => {
  const maxBytes = getChatAttachmentMaxBytes(file, limits);

  return Number.isFinite(file?.size) && file.size > maxBytes;
};
