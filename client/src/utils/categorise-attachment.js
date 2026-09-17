/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { AttachmentTypes, MediaTypeFilters } from '../constants/Enums';

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'md',
  'markdown',
  'rtf',
  'csv',
  'odt',
  'ods',
  'odp',
  'json',
  'xml',
  'html',
  'htm',
]);

const categoriseAttachment = attachment => {
  if (attachment.type === AttachmentTypes.LINK) {
    return MediaTypeFilters.LINKS;
  }

  if (attachment.type === AttachmentTypes.FILE) {
    const data = attachment.data || {};

    if (data.image) {
      return MediaTypeFilters.IMAGES;
    }

    if (data.video || (data.mimeType && data.mimeType.startsWith('video/'))) {
      return MediaTypeFilters.VIDEOS;
    }

    const extension = data.extension || '';

    if (extension && DOCUMENT_EXTENSIONS.has(extension.toLowerCase())) {
      return MediaTypeFilters.DOCUMENTS;
    }
  }

  return MediaTypeFilters.OTHERS;
};

export default categoriseAttachment;
