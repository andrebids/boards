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
