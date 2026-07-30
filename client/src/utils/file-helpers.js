/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
];

export const SUPPORTED_FILE_TYPES = [
  // Imagens
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Arquivos de design
  'application/x-photoshop',
  'image/vnd.adobe.photoshop',
  'application/illustrator',
  'image/vnd.adobe.illustrator',
  'application/postscript',
  'application/eps',
  'application/x-illustrator',
  // Vídeos
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/x-matroska',
  'video/x-m4v',
  'video/mpeg',
  'video/3gpp',
  'video/3gpp2',
  'video/mp2t',
  'video/x-ms-asf',
  'application/mxf',
  // Outros
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const isImageFile = file => {
  return IMAGE_TYPES.includes(file.type);
};

export const isSupportedFile = file => {
  // Verificar por MIME type primeiro
  const isSupportedByMimeType = SUPPORTED_FILE_TYPES.includes(file.type);

  // Se não for suportado por MIME type, verificar por extensão
  if (!isSupportedByMimeType) {
    const extension = file.name.toLowerCase().split('.').pop();

    const supportedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'bmp',
      'svg',
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'psd',
      'ai',
      'eps',
      'txt',
      'csv',
      'zip',
      'rar',
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
    ];

    return supportedExtensions.includes(extension);
  }

  return isSupportedByMimeType;
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
