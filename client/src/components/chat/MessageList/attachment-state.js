const COPY_BY_STATUS = {
  uploading: 'chat.attachmentUploading',
  unknown: 'chat.attachmentConfirming',
  failed: 'chat.attachmentFailed',
};

export const getPendingAttachmentCopy = (status) => COPY_BY_STATUS[status] || null;

export const isPendingAttachmentRetryable = ({ status, clientAttachmentId }) =>
  Boolean(clientAttachmentId) && ['unknown', 'failed'].includes(status);
