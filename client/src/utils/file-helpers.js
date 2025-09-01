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
  // Outros
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

export const MAX_IMAGES_PER_DROP = 10;
export const MAX_FILES_PER_DROP = 10;

export const isImageFile = file => {
  return IMAGE_TYPES.includes(file.type);
};

export const isSupportedFile = file => {
  console.log('🔍 Verificando arquivo:', file.name);
  console.log('🔍 MIME type:', file.type);
  console.log('🔍 Tamanho:', file.size);

  // Verificar por MIME type primeiro
  const isSupportedByMimeType = SUPPORTED_FILE_TYPES.includes(file.type);
  console.log('🔍 É suportado por MIME type?', isSupportedByMimeType);

  // Se não for suportado por MIME type, verificar por extensão
  if (!isSupportedByMimeType) {
    const extension = file.name.toLowerCase().split('.').pop();
    console.log('🔍 Extensão do arquivo:', extension);

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
    ];

    const isSupportedByExtension = supportedExtensions.includes(extension);
    console.log('🔍 É suportado por extensão?', isSupportedByExtension);

    return isSupportedByExtension;
  }

  return isSupportedByMimeType;
};

export const getFileNameWithoutExtension = filename => {
  return filename.replace(/\.[^/.]+$/, '');
};

export const validateImageFiles = files => {
  const imageFiles = files.filter(file => isImageFile(file));
  return imageFiles.slice(0, MAX_IMAGES_PER_DROP);
};

export const validateSupportedFiles = files => {
  const supportedFiles = files.filter(file => isSupportedFile(file));
  return supportedFiles.slice(0, MAX_FILES_PER_DROP);
};

export const processImageFiles = files => {
  const validFiles = validateImageFiles(files);

  return validFiles.map(file => ({
    file,
    name: getFileNameWithoutExtension(file.name),
    type: file.type,
    isImage: true,
  }));
};

export const processSupportedFiles = files => {
  const validFiles = validateSupportedFiles(files);

  return validFiles.map(file => ({
    file,
    name: getFileNameWithoutExtension(file.name),
    type: file.type,
    isImage: isImageFile(file),
  }));
};
