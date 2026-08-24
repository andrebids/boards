import { toast } from 'react-hot-toast';

import {
  getAttachmentMaxBytes,
  getFileExtension,
  isAttachmentTooLarge,
  isSupportedFile,
} from './file-helpers';
import { isLocalId } from './local-id';

export const hasPendingAttachment = (attachments) =>
  Array.from(attachments || []).some(
    (attachment) => typeof attachment.id === 'string' && isLocalId(attachment.id),
  );

const handleAttachmentFiles = (files, { onAccepted, t }) => {
  const acceptedFiles = [];

  Array.from(files || []).forEach((file) => {
    if (Number.isFinite(file?.size) && file.size === 0) {
      toast.error(
        t('common.emptyAttachmentFile', {
          name: file.name,
        }),
      );
      return;
    }

    if (!isSupportedFile(file)) {
      const extension = getFileExtension(file?.name);
      toast.error(
        t('common.unsupportedAttachmentFileType', {
          extension: extension ? `.${extension.toUpperCase()}` : t('common.unknownFileType'),
          name: file?.name || t('common.unnamedFile'),
        }),
      );
      return;
    }

    if (isAttachmentTooLarge(file)) {
      toast.error(
        t('common.attachmentFileTooLarge', {
          name: file.name,
          size: Math.floor(getAttachmentMaxBytes(file) / (1024 * 1024)),
        }),
      );
      return;
    }

    acceptedFiles.push(file);
    onAccepted?.(file);
  });

  return acceptedFiles;
};

export default handleAttachmentFiles;
