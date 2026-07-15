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
  'pptx',
  'tif',
  'tiff',
  'txt',
  'wav',
  'webm',
  'webp',
  'xlsx',
]);

export const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

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

export const isChatAttachmentTooLarge = (file) =>
  Number.isFinite(file?.size) && file.size > CHAT_ATTACHMENT_MAX_BYTES;
