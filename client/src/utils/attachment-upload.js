import { toast } from 'react-hot-toast';

import { getFileExtension, isSupportedFile } from './file-helpers';

const handleAttachmentFiles = (files, { onAccepted, t }) => {
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

    onAccepted(file);
  });
};

export default handleAttachmentFiles;
