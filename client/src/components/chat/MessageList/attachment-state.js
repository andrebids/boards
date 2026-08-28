const COPY_BY_STATUS = {
  uploading: 'chat.attachmentUploading',
  unknown: 'chat.attachmentConfirming',
  failed: 'chat.attachmentFailed',
};

export const getAttachmentDeliveryErrorMessage = (error, t) => {
  if (error?.code === 'E_HTTP_TIMEOUT') {
    return t('chat.uploadTimedOut');
  }
  if (error?.code === 'E_HTTP_NETWORK') {
    return t('chat.uploadNetworkError');
  }
  if (
    typeof error?.message === 'string' &&
    error.message !== 'HTTP request failed' &&
    error.message !== 'Invalid HTTP response'
  ) {
    return error.message;
  }

  return t('chat.uploadFailed');
};

export const getPendingAttachmentCopy = (status) => COPY_BY_STATUS[status] || null;

export const isPendingAttachmentRetryable = ({ status, clientAttachmentId }) =>
  Boolean(clientAttachmentId) && ['unknown', 'failed'].includes(status);
