/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { CardTypes } from '../constants/Enums';

export const IMAGE_TYPES = [
  'image/avif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
];

export const SUPPORTED_FILE_EXTENSIONS = Object.freeze([
  // Imagens
  'avif',
  'heic',
  'heif',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'tif',
  'tiff',
  // Documentos
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'tsv',
  'odt',
  'ods',
  'odp',
  // Design
  'psd',
  'psb',
  'ai',
  'eps',
  'indd',
  'idml',
  'xd',
  'sketch',
  'fig',
  'afdesign',
  'afphoto',
  'afpub',
  // 3D e CAD
  'obj',
  'mtl',
  'fbx',
  'stl',
  'glb',
  'gltf',
  'blend',
  '3ds',
  'max',
  'dae',
  'c4d',
  'skp',
  '3dm',
  'step',
  'stp',
  'iges',
  'igs',
  'usd',
  'usda',
  'usdc',
  'usdz',
  'dwg',
  'dxf',
  // Vídeos
  'mp4',
  'webm',
  'ogv',
  'mov',
  'avi',
  'wmv',
  'flv',
  'mkv',
  'm4v',
  '3gp',
  '3g2',
  'mpeg',
  'mpg',
  'mpe',
  'ts',
  'mts',
  'm2ts',
  'vob',
  'asf',
  'mxf',
  // Arquivos comprimidos
  'zip',
  'rar',
]);

export const SUPPORTED_FILE_ACCEPT = SUPPORTED_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

export const ATTACHMENT_MAX_BYTES = 500 * 1024 * 1024;
export const PSD_ATTACHMENT_MAX_BYTES = 1024 * 1024 * 1024;
export const THREE_D_ATTACHMENT_MAX_BYTES = 1024 * 1024 * 1024;
export const VIDEO_ATTACHMENT_MAX_BYTES = 250 * 1024 * 1024;

const ATTACHMENT_MAX_BYTES_BY_EXTENSION = Object.freeze({
  psb: PSD_ATTACHMENT_MAX_BYTES,
  psd: PSD_ATTACHMENT_MAX_BYTES,
  obj: THREE_D_ATTACHMENT_MAX_BYTES,
  mtl: THREE_D_ATTACHMENT_MAX_BYTES,
  fbx: THREE_D_ATTACHMENT_MAX_BYTES,
  stl: THREE_D_ATTACHMENT_MAX_BYTES,
  glb: THREE_D_ATTACHMENT_MAX_BYTES,
  gltf: THREE_D_ATTACHMENT_MAX_BYTES,
  blend: THREE_D_ATTACHMENT_MAX_BYTES,
  '3ds': THREE_D_ATTACHMENT_MAX_BYTES,
  max: THREE_D_ATTACHMENT_MAX_BYTES,
  dae: THREE_D_ATTACHMENT_MAX_BYTES,
  c4d: THREE_D_ATTACHMENT_MAX_BYTES,
  skp: THREE_D_ATTACHMENT_MAX_BYTES,
  '3dm': THREE_D_ATTACHMENT_MAX_BYTES,
  step: THREE_D_ATTACHMENT_MAX_BYTES,
  stp: THREE_D_ATTACHMENT_MAX_BYTES,
  iges: THREE_D_ATTACHMENT_MAX_BYTES,
  igs: THREE_D_ATTACHMENT_MAX_BYTES,
  usd: THREE_D_ATTACHMENT_MAX_BYTES,
  usda: THREE_D_ATTACHMENT_MAX_BYTES,
  usdc: THREE_D_ATTACHMENT_MAX_BYTES,
  usdz: THREE_D_ATTACHMENT_MAX_BYTES,
  dwg: THREE_D_ATTACHMENT_MAX_BYTES,
  dxf: THREE_D_ATTACHMENT_MAX_BYTES,
  mp4: VIDEO_ATTACHMENT_MAX_BYTES,
  webm: VIDEO_ATTACHMENT_MAX_BYTES,
  ogv: VIDEO_ATTACHMENT_MAX_BYTES,
  mov: VIDEO_ATTACHMENT_MAX_BYTES,
  avi: VIDEO_ATTACHMENT_MAX_BYTES,
  wmv: VIDEO_ATTACHMENT_MAX_BYTES,
  flv: VIDEO_ATTACHMENT_MAX_BYTES,
  mkv: VIDEO_ATTACHMENT_MAX_BYTES,
  m4v: VIDEO_ATTACHMENT_MAX_BYTES,
  '3gp': VIDEO_ATTACHMENT_MAX_BYTES,
  '3g2': VIDEO_ATTACHMENT_MAX_BYTES,
  mpeg: VIDEO_ATTACHMENT_MAX_BYTES,
  mpg: VIDEO_ATTACHMENT_MAX_BYTES,
  mpe: VIDEO_ATTACHMENT_MAX_BYTES,
  ts: VIDEO_ATTACHMENT_MAX_BYTES,
  mts: VIDEO_ATTACHMENT_MAX_BYTES,
  m2ts: VIDEO_ATTACHMENT_MAX_BYTES,
  vob: VIDEO_ATTACHMENT_MAX_BYTES,
  asf: VIDEO_ATTACHMENT_MAX_BYTES,
  mxf: VIDEO_ATTACHMENT_MAX_BYTES,
});

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const isImageFile = file => {
  return IMAGE_TYPES.includes(file.type);
};

export const getFileExtension = filename => {
  if (typeof filename !== 'string') {
    return null;
  }

  const basename = filename.replace(/\\/g, '/').split('/').pop().toLowerCase();
  const lastDotIndex = basename.lastIndexOf('.');

  return lastDotIndex > -1 && lastDotIndex < basename.length - 1
    ? basename.slice(lastDotIndex + 1)
    : null;
};

export const isSupportedFile = file => {
  const extension = getFileExtension(file?.name);

  return !!extension && SUPPORTED_FILE_EXTENSIONS.includes(extension);
};

export const getAttachmentMaxBytes = (file) => {
  const extension = getFileExtension(file?.name);

  return ATTACHMENT_MAX_BYTES_BY_EXTENSION[extension] || ATTACHMENT_MAX_BYTES;
};

export const isAttachmentTooLarge = (file) =>
  Number.isFinite(file?.size) && file.size > getAttachmentMaxBytes(file);

export const getFileNameWithoutExtension = filename => {
  return filename.replace(/\.[^/.]+$/, '');
};

export const preventFileDropPropagation = event => {
  event.preventDefault();
  event.stopPropagation();
};

export const validateImageFiles = files => {
  return files.filter(file => isImageFile(file));
};

export const validateSupportedFiles = files => {
  return files.filter(file => isSupportedFile(file));
};

export const processImageFiles = files => {
  const validFiles = validateImageFiles(files).sort((file1, file2) =>
    fileNameCollator.compare(file1.name, file2.name)
  );

  return validFiles.map(file => ({
    file,
    name: getFileNameWithoutExtension(file.name),
    type: file.type,
    isImage: true,
  }));
};

export const processSupportedFiles = files => {
  const validFiles = validateSupportedFiles(files).sort((file1, file2) =>
    fileNameCollator.compare(file1.name, file2.name)
  );

  return validFiles.map(file => ({
    file,
    name: getFileNameWithoutExtension(file.name),
    type: file.type,
    isImage: isImageFile(file),
  }));
};

export const buildProjectCardDataFromFile = (fileData, name) => ({
  name: name?.trim() || fileData.name,
  type: CardTypes.PROJECT,
});
