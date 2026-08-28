import {
  getAttachmentDeliveryErrorMessage,
  getPendingAttachmentCopy,
  isPendingAttachmentRetryable,
} from './attachment-state';

describe('pending chat attachment state', () => {
  test.each([
    ['uploading', 'chat.attachmentUploading', false],
    ['unknown', 'chat.attachmentConfirming', true],
    ['failed', 'chat.attachmentFailed', true],
    ['confirmed', null, false],
  ])('maps %s to truthful copy and retry state', (status, copy, retryable) => {
    expect(getPendingAttachmentCopy(status)).toBe(copy);
    expect(isPendingAttachmentRetryable({ status, clientAttachmentId: 'client-1' })).toBe(
      retryable,
    );
  });

  test('does not retry legacy pending files without an idempotency key', () => {
    expect(isPendingAttachmentRetryable({ status: 'failed' })).toBe(false);
  });

  test.each([
    [{ code: 'E_HTTP_TIMEOUT' }, 'chat.uploadTimedOut'],
    [{ code: 'E_HTTP_NETWORK' }, 'chat.uploadNetworkError'],
    [{ message: 'Storage unavailable' }, 'Storage unavailable'],
    [{ message: 'HTTP request failed' }, 'chat.uploadFailed'],
    [undefined, 'chat.uploadFailed'],
  ])('maps delivery error %p to a safe message', (error, expected) => {
    expect(getAttachmentDeliveryErrorMessage(error, (key) => key)).toBe(expected);
  });
});
