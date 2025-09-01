/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Utilitários para detecção e validação de tipos de ficheiros
 */

// Tipos de ficheiros suportados para preview
const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const SUPPORTED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'txt'];
const SUPPORTED_ARCHIVE_TYPES = ['zip', 'rar', '7z'];

/**
 * Extrai a extensão de um nome de ficheiro
 * @param {string} filename - Nome do ficheiro
 * @returns {string} Extensão em minúsculas
 */
export const getFileExtension = filename => {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  return filename.split('.').pop().toLowerCase();
};

/**
 * Detecta o tipo de ficheiro baseado na extensão
 * @param {string} filename - Nome do ficheiro
 * @returns {Object} Objeto com informações do tipo de ficheiro
 */
export const getFileType = filename => {
  const extension = getFileExtension(filename);

  return {
    extension,
    isImage: SUPPORTED_IMAGE_TYPES.includes(extension),
    isPdf: extension === 'pdf',
    isDocument: SUPPORTED_DOCUMENT_TYPES.includes(extension),
    isArchive: SUPPORTED_ARCHIVE_TYPES.includes(extension),
    isPreviewable:
      SUPPORTED_IMAGE_TYPES.includes(extension) ||
      SUPPORTED_DOCUMENT_TYPES.includes(extension),
    mimeType: getMimeType(extension),
  };
};

/**
 * Obtém o MIME type baseado na extensão
 * @param {string} extension - Extensão do ficheiro
 * @returns {string} MIME type
 */
export const getMimeType = extension => {
  const mimeTypes = {
    // Imagens
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Documentos
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',

    // Arquivos
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Valida se um ficheiro pode ser previewado
 * @param {Object} attachment - Objeto de anexo
 * @returns {boolean} True se pode ser previewado
 */
export const canPreviewFile = attachment => {
  if (!attachment || !attachment.name) {
    return false;
  }

  const fileType = getFileType(attachment.name);

  // Para imagens, verificar se tem thumbnail
  if (fileType.isImage) {
    return (
      attachment.data && attachment.data.image && attachment.data.thumbnailUrls
    );
  }

  // Para documentos, verificar se tem URL
  if (fileType.isDocument) {
    return attachment.data && attachment.data.url;
  }

  return false;
};

/**
 * Obtém a URL de preview apropriada para o tipo de ficheiro
 * @param {Object} attachment - Objeto de anexo
 * @returns {string|null} URL de preview ou null se não disponível
 */
export const getPreviewUrl = attachment => {
  if (!canPreviewFile(attachment)) {
    return null;
  }

  const fileType = getFileType(attachment.name);

  if (fileType.isImage) {
    // Para imagens, usar a URL original ou a maior thumbnail disponível
    return (
      attachment.data.url ||
      attachment.data.thumbnailUrls?.outside720 ||
      attachment.data.thumbnailUrls?.outside360
    );
  }

  if (fileType.isDocument) {
    // Para documentos, usar a URL do ficheiro
    return attachment.data.url;
  }

  return null;
};

/**
 * Obtém o ícone apropriado para o tipo de ficheiro
 * @param {string} filename - Nome do ficheiro
 * @returns {string} Nome do ícone
 */
export const getFileIcon = filename => {
  const fileType = getFileType(filename);

  if (fileType.isImage) {
    return 'image';
  }

  if (fileType.isPdf) {
    return 'file pdf outline';
  }

  if (fileType.isDocument) {
    return 'file text outline';
  }

  if (fileType.isArchive) {
    return 'archive';
  }

  return 'file outline';
};
