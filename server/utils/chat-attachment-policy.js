const fs = require('fs').promises;
const path = require('path');

const ALLOWED_EXTENSIONS = Object.freeze([
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

const EXPECTED_CONTENT_KIND = Object.freeze({
  aac: 'aac',
  avif: 'avif',
  bmp: 'bmp',
  csv: 'text',
  docx: 'docx',
  flac: 'flac',
  gif: 'gif',
  jpeg: 'jpeg',
  jpg: 'jpeg',
  json: 'text',
  m4a: 'isoMedia',
  m4v: 'isoMedia',
  md: 'text',
  mov: 'isoMedia',
  mp3: 'mp3',
  mp4: 'isoMedia',
  ogg: 'ogg',
  pdf: 'pdf',
  png: 'png',
  pptx: 'pptx',
  tif: 'tiff',
  tiff: 'tiff',
  txt: 'text',
  wav: 'wav',
  webm: 'webm',
  webp: 'webp',
  xlsx: 'xlsx',
});

const ZIP_END_OF_CENTRAL_DIRECTORY = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const MAX_ZIP_CENTRAL_DIRECTORY_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_SAMPLE_BYTES = 64 * 1024;
const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const UNSAFE_OOXML_ENTRY_PARTS = ['/activex/', '/vbadata.xml', '/vbaproject.bin'];

const startsWith = (buffer, signature) =>
  buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);

const getExtension = (filename) => {
  if (typeof filename !== 'string' || filename.includes('\0')) {
    return null;
  }

  const basename = path.basename(filename).toLowerCase();
  const extension = path.extname(basename).slice(1);
  return extension || null;
};

const hasDangerousIntermediateExtension = (filename) => {
  if (typeof filename !== 'string') {
    return false;
  }

  const parts = path.basename(filename).toLowerCase().split('.');
  return parts.slice(1, -1).some((part) => DANGEROUS_EXTENSIONS.has(part));
};

const readPart = async (fileHandle, length, position) => {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, position);
  return buffer.subarray(0, bytesRead);
};

const getOoxmlKind = async (fileHandle, size) => {
  const tailLength = Math.min(size, 65557);
  const tail = await readPart(fileHandle, tailLength, size - tailLength);
  const endOffset = tail.lastIndexOf(ZIP_END_OF_CENTRAL_DIRECTORY);

  if (endOffset < 0 || endOffset + 22 > tail.length) {
    return null;
  }

  const diskNumber = tail.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = tail.readUInt16LE(endOffset + 6);
  const entriesOnDisk = tail.readUInt16LE(endOffset + 8);
  const totalEntries = tail.readUInt16LE(endOffset + 10);
  const centralDirectorySize = tail.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = tail.readUInt32LE(endOffset + 16);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk === 0 ||
    entriesOnDisk !== totalEntries ||
    centralDirectorySize <= 0 ||
    centralDirectorySize > MAX_ZIP_CENTRAL_DIRECTORY_BYTES ||
    centralDirectoryOffset + centralDirectorySize > size
  ) {
    return null;
  }

  const centralDirectory = await readPart(fileHandle, centralDirectorySize, centralDirectoryOffset);
  const entryNames = [];
  let entryOffset = 0;

  while (entryOffset < centralDirectory.length) {
    if (
      entryOffset + 46 > centralDirectory.length ||
      centralDirectory.readUInt32LE(entryOffset) !== 0x02014b50
    ) {
      return null;
    }

    const filenameLength = centralDirectory.readUInt16LE(entryOffset + 28);
    const extraFieldLength = centralDirectory.readUInt16LE(entryOffset + 30);
    const commentLength = centralDirectory.readUInt16LE(entryOffset + 32);
    const nextEntryOffset = entryOffset + 46 + filenameLength + extraFieldLength + commentLength;

    if (filenameLength === 0 || nextEntryOffset > centralDirectory.length) {
      return null;
    }

    entryNames.push(
      centralDirectory
        .subarray(entryOffset + 46, entryOffset + 46 + filenameLength)
        .toString('utf8')
        .toLowerCase(),
    );
    entryOffset = nextEntryOffset;
  }

  if (entryNames.length !== totalEntries) {
    return null;
  }

  if (!entryNames.includes('[content_types].xml')) {
    return null;
  }
  if (
    entryNames.some((entryName) =>
      UNSAFE_OOXML_ENTRY_PARTS.some((unsafePart) => `/${entryName}`.includes(unsafePart)),
    )
  ) {
    return null;
  }
  if (entryNames.some((entryName) => entryName.startsWith('word/'))) {
    return 'docx';
  }
  if (entryNames.some((entryName) => entryName.startsWith('xl/'))) {
    return 'xlsx';
  }
  if (entryNames.some((entryName) => entryName.startsWith('ppt/'))) {
    return 'pptx';
  }

  return null;
};

const looksLikeText = (buffer) => {
  if (buffer.includes(0)) {
    return false;
  }

  const controlBytes = buffer.reduce(
    (total, byte) => total + (byte < 32 && ![9, 10, 12, 13].includes(byte) ? 1 : 0),
    0,
  );

  return buffer.length === 0 || controlBytes / buffer.length < 0.01;
};

const detectContentKind = async (filePath) => {
  const fileHandle = await fs.open(filePath, 'r');

  try {
    const { size } = await fileHandle.stat();
    const header = await readPart(fileHandle, Math.min(size, 512), 0);

    if (startsWith(header, Buffer.from('%PDF-'))) return 'pdf';
    if (startsWith(header, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'png';
    }
    if (startsWith(header, Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
    if (startsWith(header, Buffer.from('GIF87a')) || startsWith(header, Buffer.from('GIF89a'))) {
      return 'gif';
    }
    if (
      header.length >= 12 &&
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }
    if (startsWith(header, Buffer.from('BM'))) return 'bmp';
    if (
      startsWith(header, Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
      startsWith(header, Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))
    ) {
      return 'tiff';
    }
    if (startsWith(header, Buffer.from('fLaC'))) return 'flac';
    if (startsWith(header, Buffer.from('OggS'))) return 'ogg';
    if (startsWith(header, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'webm';
    if (
      header.length >= 12 &&
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WAVE'
    ) {
      return 'wav';
    }
    if (header.length >= 2 && header[0] === 0xff && [0xf1, 0xf9].includes(header[1])) {
      return 'aac';
    }
    if (
      startsWith(header, Buffer.from('ID3')) ||
      (header.length >= 2 && header[0] === 0xff && header[1] >= 0xe0)
    ) {
      return 'mp3';
    }
    if (header.length >= 12 && header.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brand = header.subarray(8, 12).toString('ascii').toLowerCase();
      return ['avif', 'avis'].includes(brand) ? 'avif' : 'isoMedia';
    }
    if (
      header.length >= 8 &&
      ['free', 'mdat', 'moov', 'wide'].includes(header.subarray(4, 8).toString('ascii'))
    ) {
      return 'isoMedia';
    }
    if (startsWith(header, Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      const ooxmlKind = await getOoxmlKind(fileHandle, size);
      return ooxmlKind;
    }

    const textSample = await readPart(fileHandle, Math.min(size, MAX_TEXT_SAMPLE_BYTES), 0);
    return looksLikeText(textSample) ? 'text' : null;
  } finally {
    await fileHandle.close();
  }
};

const validateChatAttachment = async ({ fd, filename, size }) => {
  const extension = getExtension(filename);

  if (
    !extension ||
    !ALLOWED_EXTENSIONS.includes(extension) ||
    hasDangerousIntermediateExtension(filename)
  ) {
    return { isValid: false, reason: 'extensionNotAllowed' };
  }

  if (Number.isFinite(size) && size > CHAT_ATTACHMENT_MAX_BYTES) {
    return { isValid: false, reason: 'attachmentTooLarge' };
  }

  let contentKind;
  try {
    contentKind = await detectContentKind(fd);
  } catch (error) {
    return { isValid: false, reason: 'contentUnreadable' };
  }

  if (contentKind !== EXPECTED_CONTENT_KIND[extension]) {
    return { isValid: false, reason: 'contentMismatch' };
  }

  return { extension, isValid: true };
};

module.exports = {
  ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_MAX_BYTES,
  DANGEROUS_EXTENSIONS,
  getExtension,
  hasDangerousIntermediateExtension,
  validateChatAttachment,
};
